import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(request: NextRequest) {
  let exportId: string | undefined;
  
  try {
    // Validate request body
    let body: any;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Failed to parse request body/invalid JSON in request body:', parseError);
      return NextResponse.json({ 
        error: 'Invalid JSON in request body',
        details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      }, { status: 400 });
    }

    exportId = body.exportId;

    if (!exportId) {
      return NextResponse.json({ 
        error: 'Export ID is required',
        details: 'The request body must contain an exportId field'
      }, { status: 400 });
    }

    // Validate export ID format (should be a UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(exportId)) {
      return NextResponse.json({ 
        error: 'Invalid export ID format',
        details: 'Export ID must be a valid UUID'
      }, { status: 400 });
    }

    console.log('Starting conversion for export ID:', exportId);

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
    const usdzBuffer = await downloadUsdFile(row.usdz_path);
    console.log('USDZ buffer loaded, size:', usdzBuffer.length);

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
    console.log('Converting USDZ to GLB via JavaScript parser...');
    
    const { convertUsdzToGlb } = await import('@/lib/convertUsdzToGlb');
    const conversionResult = await convertUsdzToGlb({
      usdzBuffer: usdzBuffer,
      fileName: glbFilename,
      enableFallback: true,
      roomPlanJson: roomPlanBuffer ? { buffer: roomPlanBuffer } : undefined
    });
    
    if (!conversionResult.success || !conversionResult.glbBuffer) {
      throw new Error(conversionResult.error || 'Conversion failed');
    }
    
    let glbStoragePath: string;
    let glbStorageUri: string;
    let glbUrls = {
      publicUrl: null as string | null,
      signedUrl: null as string | null,
    };

    const uploadToStorage = parseSupabaseUri(row.usdz_path) || parseSupabaseUri(row.glb_path);

    if (uploadToStorage) {
      const sanitizedUserId = sanitizeSegment(row.user_id || 'anonymous');
      const storagePath = buildGlbPath(sanitizedUserId, sanitizeSegment(row.scene_id || 'scene'), glbFilename);

      await uploadBufferToStorage(
        storageConfig.bucket,
        storagePath,
        conversionResult.glbBuffer,
        'model/gltf-binary'
      );

      glbStoragePath = storagePath;
      glbStorageUri = toSupabaseUri(storageConfig.bucket, storagePath);
      const resolved = await resolveStorageUrls(glbStorageUri);
      glbUrls.publicUrl = resolved.publicUrl;
      glbUrls.signedUrl = resolved.signedUrl;

      console.log('GLB uploaded to storage:', {
        bucket: storageConfig.bucket,
        objectPath: storagePath,
        publicUrl: glbUrls.publicUrl,
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

    console.log('Export completed successfully:', exportId);

    return NextResponse.json({
      success: true,
      glbPath: glbStorageUri,
      glbUrl: glbUrls.publicUrl || glbStorageUri,
      glbSignedUrl: glbUrls.signedUrl,
    });

  } catch (error: any) {
    console.error('Conversion failed:', error);

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

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
export const runtime = 'nodejs'; // or 'edge' if you ever switch
export const maxDuration = 10;   // seconds; stays within the Hobby plan limit