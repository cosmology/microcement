import { NextRequest, NextResponse } from 'next/server';
import { convertExport } from '@/lib/services/ConvertService';

export async function POST(request: NextRequest) {
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

    const exportId = body.exportId;

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

    // Call the shared conversion service directly
    // This endpoint is now just a thin wrapper for manual/cron triggers
    const result = await convertExport(exportId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Conversion failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      glbPath: result.glbPath,
      glbUrl: result.glbUrl,
      glbSignedUrl: result.glbSignedUrl,
    });

  } catch (error: any) {
    console.error('Conversion API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
export const runtime = 'nodejs'; // or 'edge' if you ever switch
export const maxDuration = 10;   // seconds; stays within the Hobby plan limit