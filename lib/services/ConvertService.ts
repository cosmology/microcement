// Server-only module - uses Node.js-only APIs (fs/promises, path, crypto)
// This file should only be imported in server-side code (API routes, server components)
// Next.js webpack config excludes Node.js modules (fs, path, crypto) from client bundles

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { convertUsdzToGlb } from '@/lib/convertUsdzToGlb';
import {
  storageConfig,
  parseSupabaseUri,
  toSupabaseUri,
  sanitizeSegment,
} from '@/lib/storage/utils';
import {
  downloadBufferFromStorage,
  uploadBufferToStorage,
  buildGlbPath,
  resolveStorageUrls,
} from '@/lib/storage/server';

async function downloadUsdFile(usdzPath: string) {
  const parsed = parseSupabaseUri(usdzPath);
  if (parsed) {
    return downloadBufferFromStorage(parsed.bucket, parsed.path);
  }

  const usdzFilePath = path.join(process.cwd(), 'public', usdzPath);
  return readFile(usdzFilePath);
}

async function downloadJsonMetadata(jsonPath?: string | null) {
  if (!jsonPath) return null;
  const parsed = parseSupabaseUri(jsonPath);
  if (parsed) {
    try {
      return await downloadBufferFromStorage(parsed.bucket, parsed.path);
    } catch (error) {
      console.warn('Failed to download RoomPlan metadata from storage:', error);
      return null;
    }
  }

  try {
    const jsonFilePath = path.join(process.cwd(), 'public', jsonPath);
    return await readFile(jsonFilePath);
  } catch (error) {
    console.warn('Failed to read RoomPlan metadata from filesystem:', error);
    return null;
  }
}

export interface ConvertExportResult {
  success: boolean;
  glbPath?: string;
  glbUrl?: string;
  glbSignedUrl?: string;
  error?: string;
}

/**
 * Converts an export from USDZ to GLB.
 * This is a shared service function that can be called directly without HTTP,
 * avoiding Vercel Deployment Protection issues.
 */
export async function convertExport(exportId: string): Promise<ConvertExportResult> {
  const startTime = Date.now();
  try {
    console.log(`🔄 [ConvertService] Starting conversion for export ID: ${exportId}`);

    // Update status to processing
    await supabaseAdmin
      .from('exports')
      .update({ 
        status: 'processing', 
        updated_at: new Date().toISOString() 
      })
      .eq('id', exportId);

    // Fetch export row
    const { data: row, error: fetchError } = await supabaseAdmin
      .from('exports')
      .select('*')
      .eq('id', exportId)
      .single();
    
    console.log('Fetch result:', { hasRow: !!row, error: fetchError, exportId });

    if (fetchError || !row) {
      throw new Error('Export record not found');
    }

    console.log('Processing export:', {
      id: row.id,
      usdz_path: row.usdz_path,
      scene_id: row.scene_id
    });

    // Read USDZ buffer from storage or filesystem
    console.log(`📥 [ConvertService] Downloading USDZ from: ${row.usdz_path}`);
    const usdzBuffer = await downloadUsdFile(row.usdz_path);
    console.log(`✅ [ConvertService] USDZ buffer loaded, size: ${usdzBuffer.length} bytes`);

    // Read RoomPlan JSON metadata if available
    const roomPlanBuffer = await downloadJsonMetadata((row as any).json_path);
    if (roomPlanBuffer) {
      console.log('RoomPlan metadata buffer loaded, size:', roomPlanBuffer.length);
    } else {
      console.log('No RoomPlan metadata available');
    }

    // Prepare GLB output paths
    const glbFilename = `${randomUUID()}-${sanitizeSegment(row.scene_id || 'scene')}.glb`;

    // Convert USDZ to GLB using JavaScript parser
    console.log(`🔄 [ConvertService] Converting USDZ to GLB via JavaScript parser...`);
    console.log(`   Input: ${usdzBuffer.length} bytes USDZ`);
    console.log(`   Output: ${glbFilename}`);
    
    const conversionStartTime = Date.now();
    const conversionResult = await convertUsdzToGlb({
      usdzBuffer: usdzBuffer,
      fileName: glbFilename,
      enableFallback: true,
      roomPlanJson: roomPlanBuffer ? { buffer: roomPlanBuffer } : undefined
    });
    const conversionDuration = Date.now() - conversionStartTime;
    
    console.log(`⏱️ [ConvertService] Conversion took ${conversionDuration}ms`);
    
    if (!conversionResult.success || !conversionResult.glbBuffer) {
      const errorMsg = conversionResult.error || 'Conversion failed';
      console.error(`❌ [ConvertService] Conversion failed: ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
    console.log(`✅ [ConvertService] Conversion successful, GLB size: ${conversionResult.glbBuffer.length} bytes`);
    
    let glbStoragePath: string;
    let glbStorageUri: string;
    let glbUrls = {
      publicUrl: null as string | null,
      signedUrl: null as string | null,
    };

    const uploadToStorage = parseSupabaseUri(row.usdz_path) || parseSupabaseUri(row.glb_path);
    
    console.log(`🔍 [ConvertService] Storage check:`, {
      usdzPath: row.usdz_path,
      glbPath: row.glb_path,
      uploadToStorage: !!uploadToStorage,
      bucket: storageConfig.bucket,
      glbPrefix: storageConfig.glbPrefix
    });

    if (uploadToStorage) {
      const sanitizedUserId = sanitizeSegment(row.user_id || 'anonymous');
      const sanitizedSceneId = sanitizeSegment(row.scene_id || 'scene');
      const storagePath = buildGlbPath(sanitizedUserId, sanitizedSceneId, glbFilename);
      
      console.log(`📁 [ConvertService] GLB storage path constructed:`, {
        userId: row.user_id,
        sanitizedUserId,
        sceneId: row.scene_id,
        sanitizedSceneId,
        filename: glbFilename,
        fullPath: storagePath,
        expectedBucket: storageConfig.bucket,
        expectedPrefix: storageConfig.glbPrefix
      });

      console.log(`📤 [ConvertService] Uploading GLB to Supabase Storage...`);
      console.log(`   Bucket: ${storageConfig.bucket}`);
      console.log(`   Path: ${storagePath}`);
      console.log(`   Size: ${conversionResult.glbBuffer.length} bytes`);

      const uploadStartTime = Date.now();
      try {
        await uploadBufferToStorage(
          storageConfig.bucket,
          storagePath,
          conversionResult.glbBuffer,
          'model/gltf-binary'
        );
        const uploadDuration = Date.now() - uploadStartTime;
        console.log(`✅ [ConvertService] GLB uploaded successfully in ${uploadDuration}ms`);
        
        // Verify the upload by checking if the file exists
        const { data: verifyData, error: verifyError } = await supabaseAdmin.storage
          .from(storageConfig.bucket)
          .list(storagePath.split('/').slice(0, -1).join('/'), {
            limit: 100,
            search: storagePath.split('/').pop()
          });
        
        if (verifyError) {
          console.warn(`⚠️ [ConvertService] Could not verify upload: ${verifyError.message}`);
        } else {
          const fileExists = verifyData?.some(file => file.name === storagePath.split('/').pop());
          console.log(`✅ [ConvertService] Upload verification: ${fileExists ? 'File exists' : 'File not found in listing'}`);
        }
      } catch (uploadError: any) {
        console.error(`❌ [ConvertService] GLB upload failed:`, uploadError);
        console.error(`   Error message: ${uploadError?.message}`);
        console.error(`   Error stack: ${uploadError?.stack}`);
        throw new Error(`Failed to upload GLB to storage: ${uploadError?.message || 'Unknown error'}`);
      }

      glbStoragePath = storagePath;
      glbStorageUri = toSupabaseUri(storageConfig.bucket, storagePath);
      const resolved = await resolveStorageUrls(glbStorageUri);
      glbUrls.publicUrl = resolved.publicUrl;
      glbUrls.signedUrl = resolved.signedUrl;

      console.log('✅ [ConvertService] GLB uploaded to storage:', {
        bucket: storageConfig.bucket,
        objectPath: storagePath,
        publicUrl: glbUrls.publicUrl,
        signedUrl: glbUrls.signedUrl ? 'generated' : 'not generated',
      });
    } else {
      const glbUploadDir = path.join(process.cwd(), 'public', 'models', 'scanned-rooms', row.user_id || 'anonymous');
      await mkdir(glbUploadDir, { recursive: true });
      const glbFilePath = path.join(glbUploadDir, glbFilename);
      await writeFile(glbFilePath, conversionResult.glbBuffer);

      glbStoragePath = `/models/scanned-rooms/${row.user_id || 'anonymous'}/${glbFilename}`;
      glbStorageUri = glbStoragePath;
      glbUrls.publicUrl = glbStoragePath;

      console.log('GLB saved to filesystem:', glbFilePath);
    }

    // Update database with success
    await supabaseAdmin
      .from('exports')
      .update({
        status: 'ready',
        glb_path: glbStorageUri,
        updated_at: new Date().toISOString()
      })
      .eq('id', exportId);

    // Notify via Supabase Realtime
    try {
      await supabaseAdmin.rpc('notify_export_ready', {
        export_id: exportId,
        glb_url: glbUrls.publicUrl || glbStorageUri
      });
    } catch (notifyError) {
      console.warn('Failed to send notification:', notifyError);
      // Don't fail the entire operation if notification fails
    }

    const totalDuration = Date.now() - startTime;
    console.log(`✅ [ConvertService] Export completed successfully in ${totalDuration}ms: ${exportId}`);
    console.log(`   GLB Path: ${glbStorageUri}`);
    console.log(`   GLB URL: ${glbUrls.publicUrl || glbStorageUri}`);

    return {
      success: true,
      glbPath: glbStorageUri,
      glbUrl: glbUrls.publicUrl || glbStorageUri,
      glbSignedUrl: glbUrls.signedUrl || undefined,
    };

  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`❌ [ConvertService] Conversion failed after ${totalDuration}ms for export ${exportId}:`, error);
    console.error('   Error message:', error?.message);
    console.error('   Error stack:', error?.stack);

    // Update database with error
    try {
      await supabaseAdmin
        .from('exports')
        .update({
          status: 'failed',
          error: error.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', exportId);
    } catch (dbError) {
      console.error('Failed to update error status:', dbError);
    }

    return {
      success: false,
      error: error.message,
    };
  }
}

