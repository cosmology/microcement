import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import {
  storageConfig,
  sanitizeSegment,
  toSupabaseUri,
} from '@/lib/storage/utils';
import {
  uploadBufferToStorage,
  buildIosUploadPath,
  buildJsonMetadataPath,
  resolveStorageUrls,
} from '@/lib/storage/server';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Upload from iOS API called ===');
    
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const jsonFile = formData.get('jsonFile') as File | null; // RoomPlan JSON metadata
    const userId = formData.get('userId') as string | null;
    const sceneId = formData.get('sceneId') as string | null;

    console.log('Form data received:', {
      hasFile: !!file,
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size,
      hasJsonFile: !!jsonFile,
      jsonFileName: jsonFile?.name,
      jsonFileType: jsonFile?.type,
      jsonFileSize: jsonFile?.size,
      userId: userId,
      userIdLength: userId?.length,
      sceneId: sceneId,
      sceneIdLength: sceneId?.length
    });

    if (!file) {
      console.log('ERROR: No file uploaded');
      return NextResponse.json({ error: 'No USDZ file uploaded.' }, { status: 400 });
    }

    if (file.type !== 'model/vnd.usdz+zip' && !file.name.endsWith('.usdz')) {
      console.log('ERROR: Invalid file type', { fileType: file.type, fileName: file.name });
      return NextResponse.json({ error: 'Only USDZ files are allowed.' }, { status: 400 });
    }

    // Validate JSON file if provided
    if (jsonFile && !jsonFile.name.endsWith('.json') && !jsonFile.type.includes('json')) {
      console.log('ERROR: Invalid JSON file type', { jsonFileType: jsonFile.type, jsonFileName: jsonFile.name });
      return NextResponse.json({ error: 'JSON file must be a valid JSON file.' }, { status: 400 });
    }

    if (!userId) {
      console.log('ERROR: No user ID provided');
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.log('ERROR: Invalid UUID format', { userId: userId });
      return NextResponse.json({ error: 'Invalid user ID format. Must be a valid UUID.' }, { status: 400 });
    }

    console.log('All validations passed, processing files...');

    const sanitizedUserId = sanitizeSegment(userId);
    const finalSceneId = sceneId || `room-scan-${Date.now()}`;
    const sanitizedSceneId = sanitizeSegment(finalSceneId);

    const makeFilename = (original: string, extension: string) => {
      const base = original.replace(/\.[^/.]+$/, '');
      const sanitizedBase = sanitizeSegment(base) || 'room';
      return `${randomUUID()}-${sanitizedBase}.${extension}`;
    };

    // Process USDZ file
    const usdzBuffer = Buffer.from(await file.arrayBuffer());
    const usdzFilename = makeFilename(file.name, 'usdz');
    const usdzObjectPath = buildIosUploadPath(sanitizedUserId, sanitizedSceneId, usdzFilename);

    await uploadBufferToStorage(
      storageConfig.bucket,
      usdzObjectPath,
      usdzBuffer,
      file.type || 'model/vnd.usdz+zip'
    );

    const usdzUri = toSupabaseUri(storageConfig.bucket, usdzObjectPath);
    const usdzUrls = await resolveStorageUrls(usdzUri);

    console.log('USDZ file uploaded:', {
      bucket: storageConfig.bucket,
      objectPath: usdzObjectPath,
      publicUrl: usdzUrls.publicUrl,
    });

    // Process JSON metadata file if provided
    let jsonUri: string | null = null;
    let jsonUrls: Awaited<ReturnType<typeof resolveStorageUrls>> | null = null;

    if (jsonFile) {
      const jsonBuffer = Buffer.from(await jsonFile.arrayBuffer());
      const jsonFilename = makeFilename(jsonFile.name || file.name, 'json');
      const jsonObjectPath = buildJsonMetadataPath(sanitizedUserId, sanitizedSceneId, jsonFilename);

      await uploadBufferToStorage(
        storageConfig.bucket,
        jsonObjectPath,
        jsonBuffer,
        jsonFile.type || 'application/json'
      );

      jsonUri = toSupabaseUri(storageConfig.bucket, jsonObjectPath);
      jsonUrls = await resolveStorageUrls(jsonUri);

      console.log('JSON metadata uploaded:', {
        bucket: storageConfig.bucket,
        objectPath: jsonObjectPath,
        publicUrl: jsonUrls.publicUrl,
      });
    }

    // Automatically trigger the export pipeline with timeout
    // This awaits conversion up to 4 minutes (Vercel Pro plan has 5 minute maxDuration limit)
    // If conversion completes within timeout, we return success. Otherwise, it continues in background.
    let exportId: string | null = null;
    let conversionCompleted = false;
    let conversionResult: any = null;
    const startTime = Date.now();
    
    try {
      const { createExportAndAwait } = await import('@/lib/services/ExportService');
      const exportResult = await createExportAndAwait({
        sceneId: finalSceneId,
        usdzPath: usdzUri,
        userId,
        jsonPath: jsonUri
      }, 240000); // 4 minute timeout (leaving 1 minute buffer for Pro plan's 5 minute maxDuration)
      
      const conversionDuration = Date.now() - startTime;
      console.log(`⏱️ [Upload API] Conversion attempt completed in ${conversionDuration}ms`);
      
      console.log('Export pipeline result:', {
        exportId: exportResult.id,
        status: exportResult.status,
        completed: exportResult.completed
      });
      
      exportId = exportResult.id;
      conversionCompleted = exportResult.completed || false;
      conversionResult = exportResult.conversionResult;
      
      if (conversionCompleted && exportResult.conversionResult?.success) {
        console.log('✅ Conversion completed successfully during upload!');
        console.log(`   GLB Path: ${exportResult.conversionResult.glbPath}`);
        console.log(`   GLB URL: ${exportResult.conversionResult.glbUrl}`);
      } else if (!conversionCompleted) {
        console.log('⏱️ Conversion started but did not complete within timeout');
        console.log('   Client can poll export status or use Realtime to get notified when ready');
      }
    } catch (error) {
      console.error('Error triggering export pipeline:', error);
      // Don't fail the upload if export creation fails - the export can be created manually later
    }
    
    // Return success with file URL and export ID
    const fileAccessibleUrl = usdzUrls.publicUrl || usdzUrls.signedUrl || usdzUri;
    const jsonAccessibleUrl = jsonUrls?.publicUrl || jsonUrls?.signedUrl || jsonUri || null;

    // Calculate file size for user messaging
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const isLargeFile = file.size > 10 * 1024 * 1024; // > 10MB
    
    const response = {
      message: conversionCompleted 
        ? `File uploaded successfully (${fileSizeMB} MB) and conversion completed in ${((Date.now() - startTime) / 1000).toFixed(1)}s`
        : isLargeFile 
          ? `File uploaded successfully (${fileSizeMB} MB). Large scan detected - conversion may take a few minutes. Please wait and check back shortly.`
          : `File uploaded successfully (${fileSizeMB} MB) and conversion started. This usually takes 5-10 seconds for typical room scans.`,
      userId,
      sceneId: finalSceneId,
      exportId,
      conversion: {
        completed: conversionCompleted,
        status: conversionCompleted 
          ? (conversionResult?.success ? 'ready' : 'failed')
          : 'processing',
        glbPath: conversionResult?.glbPath,
        glbUrl: conversionResult?.glbUrl,
        glbSignedUrl: conversionResult?.glbSignedUrl,
        error: conversionResult?.error,
        durationMs: Date.now() - startTime,
        fileSizeMB: parseFloat(fileSizeMB),
        note: !conversionCompleted && isLargeFile 
          ? 'Large scans (>10MB) may take up to 4 minutes to process. Please be patient or check back later.'
          : !conversionCompleted 
            ? 'Conversion is processing in the background. Check back in a few moments.'
            : null,
      },
      file: {
        storagePath: usdzUri,
        path: fileAccessibleUrl,
        publicUrl: usdzUrls.publicUrl,
        signedUrl: usdzUrls.signedUrl,
        bucket: usdzUrls.bucket ?? storageConfig.bucket,
        objectPath: usdzUrls.objectPath,
      },
      json: jsonUri
        ? {
            storagePath: jsonUri,
            path: jsonAccessibleUrl,
            publicUrl: jsonUrls?.publicUrl ?? null,
            signedUrl: jsonUrls?.signedUrl ?? null,
            bucket: jsonUrls?.bucket ?? storageConfig.bucket,
            objectPath: jsonUrls?.objectPath ?? null,
          }
        : null,
      fileUrl: fileAccessibleUrl,
      jsonFileUrl: jsonAccessibleUrl,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error uploading USDZ file from iOS:', error);
    return NextResponse.json({ error: 'Failed to upload file.' }, { status: 500 });
  }
}
