import { supabaseAdmin } from '@/lib/supabaseAdmin';

export interface CreateExportParams {
  sceneId: string;
  usdzPath: string;
  userId?: string | null;
  jsonPath?: string | null;
}

export interface CreateExportResult {
  id: string;
  status: string;
  completed?: boolean; // true if conversion completed during the await period
  conversionResult?: {
    success: boolean;
    glbPath?: string;
    glbUrl?: string;
    glbSignedUrl?: string;
    error?: string;
  };
}

/**
 * Creates a promise that resolves after a delay (for timeout purposes)
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates an export record in the database and triggers background conversion.
 * This is a shared service function that calls the conversion logic directly,
 * avoiding HTTP calls that may be blocked by Vercel Deployment Protection.
 * 
 * NOTE: Uses dynamic import to avoid bundling Node.js-only modules on client-side
 */
export async function createExport(params: CreateExportParams): Promise<CreateExportResult> {
  const { sceneId, usdzPath, userId, jsonPath } = params;

  if (!sceneId || !usdzPath) {
    throw new Error('sceneId and usdzPath are required');
  }

  // Validate UUID format if userId is provided
  if (userId) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      throw new Error('Invalid user ID format. Must be a valid UUID.');
    }
  }

  // Insert metadata row
  const { data, error } = await supabaseAdmin
    .from('exports')
    .insert({
      user_id: userId || null,
      scene_id: sceneId,
      usdz_path: usdzPath,
      json_path: jsonPath || null,
      status: 'queued'
    })
    .select()
    .single();

  if (error) {
    console.error('Database error creating export:', error);
    throw new Error(`Failed to create export: ${error.message}`);
  }

  // Trigger background conversion directly (no HTTP call needed)
  // Use dynamic import to avoid bundling Node.js-only modules on client-side
  // This avoids Vercel Deployment Protection issues
  // 
  // NOTE: On Vercel, serverless functions may terminate background promises when the function returns.
  // For production, consider using Vercel Cron Jobs to poll for queued exports instead.
  const conversionPromise = import('./ConvertService')
    .then(({ convertExport }) => {
      console.log(`🚀 [ExportService] Starting background conversion for export ${data.id}`);
      console.log(`   Export ID: ${data.id}`);
      console.log(`   USDZ Path: ${usdzPath}`);
      console.log(`   JSON Path: ${jsonPath || 'none'}`);
      return convertExport(data.id);
    })
    .then((result) => {
      if (result.success) {
        console.log(`✅ [ExportService] Conversion completed successfully for export ${data.id}`);
        console.log(`   GLB Path: ${result.glbPath}`);
        console.log(`   GLB URL: ${result.glbUrl}`);
        if (result.glbSignedUrl) {
          console.log(`   GLB Signed URL: ${result.glbSignedUrl.substring(0, 100)}...`);
        }
      } else {
        console.error(`❌ [ExportService] Conversion failed for export ${data.id}:`, result.error);
      }
      return result;
    })
    .catch((e) => {
      console.error(`❌ [ExportService] Background conversion error for export ${data.id}:`, e);
      console.error('   Error type:', e?.constructor?.name || typeof e);
      console.error('   Error message:', e instanceof Error ? e.message : String(e));
      console.error('   Error stack:', e instanceof Error ? e.stack : 'No stack trace');
      // Update export status to failed in database
      (async () => {
        try {
          const { error: dbError } = await supabaseAdmin
            .from('exports')
            .update({ 
              status: 'failed', 
              error: e instanceof Error ? e.message : String(e),
              updated_at: new Date().toISOString()
            })
            .eq('id', data.id);
          
          if (dbError) {
            console.error(`❌ [ExportService] Failed to update error status in database:`, dbError);
          }
        } catch (dbError) {
          console.error(`❌ [ExportService] Exception updating error status in database:`, dbError);
        }
      })();
      // Don't throw - export is still created and can be retried later
    })
    .catch((importError) => {
      console.error('❌ [ExportService] Failed to load ConvertService:', importError);
      console.error('   Error type:', importError?.constructor?.name || typeof importError);
      console.error('   Error message:', importError instanceof Error ? importError.message : String(importError));
      console.error('   Error stack:', importError instanceof Error ? importError.stack : 'No stack trace');
      // Don't throw - export is still created and can be processed later
    });

  // On Vercel, we can't reliably await background promises because the function may return first.
  // However, we can at least ensure the promise is started and will log any errors.
  // For production, use Vercel Cron Jobs to poll for queued exports.
  
  // Log that conversion was initiated (but not awaited)
  console.log(`📋 [ExportService] Export ${data.id} created and conversion initiated (background)`);
  console.log(`   Note: On Vercel, background promises may be killed when the function returns.`);
  console.log(`   Consider using Vercel Cron Jobs to process queued exports periodically.`);

  return {
    id: data.id,
    status: data.status
  };
}

/**
 * Creates an export and awaits conversion with a timeout.
 * This is designed for Vercel Hobby plan (10-second maxDuration limit).
 * 
 * @param params Export creation parameters
 * @param timeoutMs Maximum time to wait for conversion (default: 8000ms for Hobby plan)
 * @returns Export result with conversion status if completed within timeout
 */
export async function createExportAndAwait(
  params: CreateExportParams,
  timeoutMs: number = 8000 // 8 seconds (leaving 2s buffer for Hobby's 10s limit)
): Promise<CreateExportResult> {
  // First, create the export record
  const exportData = await createExport(params);
  const exportId = exportData.id;
  
  console.log(`🚀 [ExportService] Starting conversion with timeout (${timeoutMs}ms) for export ${exportId}`);
  
  // Import ConvertService and start conversion
  const conversionPromise = import('./ConvertService')
    .then(({ convertExport }) => {
      return convertExport(exportId).then((conversionResult) => {
        return { exportId, conversionResult, completed: true };
      });
    })
    .catch((e) => {
      console.error('❌ [ExportService] Error during awaitable conversion:', e);
      return {
        exportId,
        conversionResult: {
          success: false,
          error: e instanceof Error ? e.message : String(e)
        },
        completed: false
      };
    });

  // Timeout promise
  const timeoutPromise = sleep(timeoutMs).then(() => {
    return { exportId, timedOut: true, completed: false };
  });

  try {
    // Race between conversion completion and timeout
    const raceResult = await Promise.race([conversionPromise, timeoutPromise]);
    
    // Check if conversion completed
    if ('conversionResult' in raceResult && raceResult.completed) {
      const { exportId: id, conversionResult } = raceResult;
      console.log(`✅ [ExportService] Conversion completed within timeout for export ${id}`);
      return {
        id,
        status: conversionResult.success ? 'ready' : 'failed',
        completed: true,
        conversionResult
      };
    }
    
    // Timeout occurred - conversion still running in background (may be killed by Vercel)
    console.log(`⏱️ [ExportService] Conversion timeout after ${timeoutMs}ms for export ${exportId}`);
    console.log(`   Conversion continues in background (may be killed by Vercel function termination)`);
    console.log(`   Client should poll export status or use Realtime to get notified when ready`);
    
    // Note: Conversion is still running, but may be killed when function returns
    // Fallback: Use the GET /api/background/convert endpoint manually or with a cron job
    return {
      id: exportId,
      status: 'processing',
      completed: false
    };
  } catch (error) {
    console.error(`❌ [ExportService] Error in awaitable export creation:`, error);
    return {
      id: exportId,
      status: 'queued', // Export was created, will be processed later
      completed: false
    };
  }
}

