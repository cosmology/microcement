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
  import('./ConvertService').then(({ convertExport }) => {
    console.log(`🚀 [ExportService] Starting background conversion for export ${data.id}`);
    convertExport(data.id)
      .then((result) => {
        if (result.success) {
          console.log(`✅ [ExportService] Conversion completed successfully for export ${data.id}`);
          console.log(`   GLB Path: ${result.glbPath}`);
          console.log(`   GLB URL: ${result.glbUrl}`);
        } else {
          console.error(`❌ [ExportService] Conversion failed for export ${data.id}:`, result.error);
        }
      })
      .catch((e) => {
        console.error(`❌ [ExportService] Background conversion error for export ${data.id}:`, e);
        console.error('   Error stack:', e instanceof Error ? e.stack : 'No stack trace');
        // Don't throw - export is still created and can be retried later
      });
  }).catch((e) => {
    console.error('❌ [ExportService] Failed to load ConvertService:', e);
    console.error('   Error stack:', e instanceof Error ? e.stack : 'No stack trace');
    // Don't throw - export is still created and can be processed later
  });

  return {
    id: data.id,
    status: data.status
  };
}

