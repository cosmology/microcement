import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

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

    const uploadDir = path.join(process.cwd(), 'public', 'models', 'scanned-rooms', userId);
    await mkdir(uploadDir, { recursive: true });

    // Process USDZ file
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${randomUUID()}-${file.name}`;
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);
    const fileUrl = `/models/scanned-rooms/${userId}/${filename}`;
    
    console.log('USDZ file saved:', { filePath, fileUrl });

    // Process JSON metadata file if provided
    let jsonFilePath: string | null = null;
    let jsonFileUrl: string | null = null;
    if (jsonFile) {
      // Generate matching filename for JSON: {UUID}-room-{originalName}.json
      const jsonFilename = filename.replace('-Room.usdz', '-room.json').replace('.usdz', '-room.json');
      jsonFilePath = path.join(uploadDir, jsonFilename);
      const jsonBuffer = Buffer.from(await jsonFile.arrayBuffer());
      await writeFile(jsonFilePath, jsonBuffer);
      jsonFileUrl = `/models/scanned-rooms/${userId}/${jsonFilename}`;
      console.log('JSON file saved:', { jsonFilePath, jsonFileUrl });
    }

    const finalSceneId = sceneId || `room-scan-${Date.now()}`;
    
    // Automatically trigger the export pipeline
    let exportId = null;
    try {
      const exportResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/exports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sceneId: finalSceneId,
          usdzPath: fileUrl,
          userId,
          jsonPath: jsonFileUrl
        }),
      });

      if (exportResponse.ok) {
        const exportData = await exportResponse.json();
        console.log('Export pipeline triggered successfully:', exportData);
        exportId = exportData.id;
      } else {
        console.error('Failed to trigger export pipeline:', await exportResponse.text());
      }
    } catch (error) {
      console.error('Error triggering export pipeline:', error);
    }
    
    // Return success with file URL and export ID
    const response = {
      message: 'File uploaded successfully and export pipeline started',
      fileUrl,
      jsonFileUrl,
      userId,
      sceneId: finalSceneId,
      exportId
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error uploading USDZ file from iOS:', error);
    return NextResponse.json({ error: 'Failed to upload file.' }, { status: 500 });
  }
}
