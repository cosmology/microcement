import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sceneId, usdzPath, userId, jsonPath } = body;

    // Use dynamic import to avoid bundling server-only modules on client-side
    // This prevents 'fs/promises' and other Node.js modules from being included in client bundles
    const { createExport } = await import('@/lib/services/ExportService');
    
    // Use shared service function to create export
    // This ensures consistent behavior and avoids code duplication
    const result = await createExport({
      sceneId,
      usdzPath,
      userId,
      jsonPath
    });

    return NextResponse.json({
      message: 'Export queued successfully',
      id: result.id,
      status: result.status
    }, { status: 202 });

  } catch (error) {
    console.error('Export API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const statusCode = errorMessage.includes('required') || errorMessage.includes('Invalid') ? 400 : 500;
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

