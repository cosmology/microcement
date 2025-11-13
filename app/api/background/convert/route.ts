import { NextRequest, NextResponse } from 'next/server';
import { convertExport } from '@/lib/services/ConvertService';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * GET handler - Processes one queued export (called by Vercel Cron Jobs)
 * This is the reliable way to process conversions on Vercel, as background
 * promises in serverless functions may be killed when the function returns.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron job request (optional security check)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 [Cron] Processing queued exports...');

    // Find one queued export
    const { data: queuedExports, error: fetchError } = await supabaseAdmin
      .from('exports')
      .select('id, scene_id, usdz_path, created_at')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(1);

    if (fetchError) {
      console.error('❌ [Cron] Failed to fetch queued exports:', fetchError);
      return NextResponse.json(
        { error: 'Database error', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!queuedExports || queuedExports.length === 0) {
      console.log('✅ [Cron] No queued exports found');
      return NextResponse.json({
        success: true,
        message: 'No queued exports to process',
        processed: 0,
      });
    }

    const exportToProcess = queuedExports[0];
    console.log(`📋 [Cron] Processing export ${exportToProcess.id}`);
    console.log(`   Scene ID: ${exportToProcess.scene_id}`);
    console.log(`   USDZ Path: ${exportToProcess.usdz_path}`);
    console.log(`   Created: ${exportToProcess.created_at}`);

    // Process the export
    const result = await convertExport(exportToProcess.id);

    if (!result.success) {
      console.error(`❌ [Cron] Conversion failed for export ${exportToProcess.id}:`, result.error);
      return NextResponse.json(
        { 
          success: false,
          error: result.error || 'Conversion failed',
          exportId: exportToProcess.id,
        },
        { status: 500 }
      );
    }

    console.log(`✅ [Cron] Successfully processed export ${exportToProcess.id}`);
    console.log(`   GLB Path: ${result.glbPath}`);
    console.log(`   GLB URL: ${result.glbUrl}`);

    return NextResponse.json({
      success: true,
      message: 'Export processed successfully',
      exportId: exportToProcess.id,
      glbPath: result.glbPath,
      glbUrl: result.glbUrl,
      glbSignedUrl: result.glbSignedUrl,
      processed: 1,
    });

  } catch (error: any) {
    console.error('❌ [Cron] Error processing exports:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Internal server error',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler - Processes a specific export by ID (manual trigger)
 */
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
export const runtime = 'nodejs'; // Must be nodejs for USDZ conversion (uses Node.js APIs)
export const maxDuration = 300;  // 5 minutes (max for Pro plan; Hobby plan is limited to 10s)
// NOTE: Hobby plan has a 10-second maxDuration limit. If conversions take longer,
// consider upgrading to Pro plan or optimizing the conversion process.