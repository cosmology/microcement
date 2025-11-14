import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { resolveStorageUrls } from '@/lib/storage/server';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('🚀 [ScannedRooms] API called');
  
  try {
    // Fetch all ready exports directly (single query)
    // Include json_path in the SELECT to properly resolve JSON metadata URLs
    const { data: exports, error } = await supabaseAdmin
      .from('exports')
      .select('id, user_id, scene_id, usdz_path, glb_path, json_path, status, error, created_at, updated_at')
      .eq('status', 'ready')
      .not('glb_path', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [ScannedRooms] Database error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    console.log(`✅ [ScannedRooms] Found ${exports?.length || 0} ready exports in ${Date.now() - startTime}ms`);

    const rooms = await Promise.all(
      (exports || []).map(async (exportItem) => {
        // Use json_path from database if available
        // Note: The fallback derivation from USDZ path is unreliable because:
        // - USDZ files are in ios-uploads/, JSON files are in ios-metadata/
        // - Each file gets its own UUID, so filenames don't match
        const existingJsonPath = (exportItem as any).json_path || null;

        const [usdzUrls, glbUrls, jsonUrls] = await Promise.all([
          resolveStorageUrls(exportItem.usdz_path ?? null),
          resolveStorageUrls(exportItem.glb_path ?? null),
          resolveStorageUrls(existingJsonPath ?? null),
        ]);

        return {
          id: exportItem.id,
          user_id: exportItem.user_id,
          scene_id: exportItem.scene_id,
          usdz_path: exportItem.usdz_path,
          glb_path: exportItem.glb_path,
          status: exportItem.status,
          error: exportItem.error,
          created_at: exportItem.created_at,
          updated_at: exportItem.updated_at,
          json_path: existingJsonPath,
          usdz_public_url: usdzUrls.publicUrl,
          usdz_signed_url: usdzUrls.signedUrl,
          glb_public_url: glbUrls.publicUrl,
          glb_signed_url: glbUrls.signedUrl,
          json_public_url: jsonUrls.publicUrl,
          json_signed_url: jsonUrls.signedUrl,
        };
      })
    );

    const duration = Date.now() - startTime;
    console.log(`✅ [ScannedRooms] Returning ${rooms.length} rooms in ${duration}ms`);

    return NextResponse.json({ 
      rooms: rooms,
      count: rooms.length
    });

  } catch (error) {
    console.error('Error in scanned-rooms API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
