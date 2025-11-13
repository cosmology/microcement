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
      supabaseAdmin
        .from('exports')
        .update({ 
          status: 'failed', 
          error: e instanceof Error ? e.message : String(e),
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id)
        .catch((dbError) => {
          console.error(`❌ [ExportService] Failed to update error status in database:`, dbError);
        });
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

