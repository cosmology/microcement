import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { convertUsdzToGlb, CONVERSION_ERRORS, USER_ERROR_MESSAGES } from '@/lib/convertUsdzToGlb';
import { randomUUID } from 'crypto';


// USDZ to GLB conversion using the robust conversion module
async function performUsdzConversion(usdzBuffer: Buffer, fileName: string): Promise<Buffer> {
  console.log('Starting USDZ to GLB conversion...');
  console.log('USDZ file:', fileName, 'Size:', usdzBuffer.length, 'bytes');
  
  // Use the robust conversion module
  const result = await convertUsdzToGlb({
    usdzBuffer,
    fileName,
    maxFileSize: 50 * 1024 * 1024, // 50MB limit
    enableFallback: true // Enable fallback for working conversion
  });
  
  if (!result.success) {
    console.error('USDZ conversion failed:', result.error);
    if (result.warning) {
      console.warn('Conversion warning:', result.warning);
    }
    
    // Provide user-friendly error message
    const userMessage = result.error && USER_ERROR_MESSAGES[result.error as keyof typeof USER_ERROR_MESSAGES] 
      ? USER_ERROR_MESSAGES[result.error as keyof typeof USER_ERROR_MESSAGES]
      : result.error || 'USDZ conversion failed';
    
    throw new Error(`USDZ conversion failed: ${userMessage}`);
  }
  
  console.log('USDZ conversion successful, GLB size:', result.glbBuffer!.length);
  if (result.warning) {
    console.warn('Conversion warning:', result.warning);
  }
  return result.glbBuffer!;
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

    // Read USDZ file from local filesystem (public folder)
    const usdzFilePath = path.join(process.cwd(), 'public', row.usdz_path);
    console.log('Reading USDZ from local file:', usdzFilePath);
    
    let usdzBuffer: Buffer;
    try {
      usdzBuffer = await readFile(usdzFilePath);
      console.log('Read USDZ file, size:', usdzBuffer.length);
    } catch (fileError: any) {
      throw new Error(`Failed to read USDZ file: ${fileError.message}`);
    }

    // Read RoomPlan JSON if available
    let roomPlanJsonPath: string | undefined;
    if ((row as any).json_path) {
      roomPlanJsonPath = path.join(process.cwd(), 'public', (row as any).json_path);
      console.log('RoomPlan JSON available:', roomPlanJsonPath);
    } else {
      console.log('No RoomPlan JSON metadata available (json_path not in schema)');
    }

    // Prepare GLB output paths
    const glbFilename = `${randomUUID()}-${row.scene_id}.glb`;
    const glbUploadDir = path.join(process.cwd(), 'public', 'models', 'scanned-rooms', row.user_id || 'anonymous');
    const glbFilePath = path.join(glbUploadDir, glbFilename);
    
    // Ensure the directory exists
    await mkdir(glbUploadDir, { recursive: true });

    // Convert USDZ to GLB using JavaScript parser
    console.log('Converting USDZ to GLB via JavaScript parser...');
    
    const { convertUsdzToGlb } = await import('@/lib/convertUsdzToGlb');
    const conversionResult = await convertUsdzToGlb({
      usdzBuffer: usdzBuffer,
      fileName: glbFilename,
      enableFallback: true,
      roomPlanJson: roomPlanJsonPath ? { path: roomPlanJsonPath } : undefined
    });
    
    if (!conversionResult.success || !conversionResult.glbBuffer) {
      throw new Error(conversionResult.error || 'Conversion failed');
    }
    
    // Write GLB file to filesystem
    await writeFile(glbFilePath, conversionResult.glbBuffer);
    console.log('GLB file written successfully');
    console.log('Conversion complete');
    
    const glbUrl = `/models/scanned-rooms/${row.user_id || 'anonymous'}/${glbFilename}`;
    console.log('GLB saved locally to:', glbUrl);

    // Update database with success
    await supabaseAdmin
      .from('exports')
      .update({
        status: 'ready',
        glb_path: glbUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', exportId);

    // Notify via Supabase Realtime
    try {
      await supabaseAdmin.rpc('notify_export_ready', {
        export_id: exportId,
        glb_url: glbUrl
      });
    } catch (notifyError) {
      console.warn('Failed to send notification:', notifyError);
      // Don't fail the entire operation if notification fails
    }

    console.log('Export completed successfully:', exportId);

    return NextResponse.json({ 
      success: true, 
      glbPath: glbUrl,
      glbUrl: glbUrl 
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
