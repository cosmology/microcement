import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('🚀 [ScannedRooms] API called');
  
  try {
    // Fetch all ready exports directly (single query)
    const { data: exports, error } = await supabaseAdmin
      .from('exports')
      .select('id, user_id, scene_id, usdz_path, glb_path, status, error, created_at, updated_at')
      .eq('status', 'ready')
      .not('glb_path', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [ScannedRooms] Database error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    console.log(`✅ [ScannedRooms] Found ${exports?.length || 0} ready exports in ${Date.now() - startTime}ms`);

    // Convert to display format with JSON path
    const rooms = exports?.map(exportItem => {
      const jsonPath = exportItem.usdz_path 
        ? exportItem.usdz_path.replace('-Room.usdz', '-room.json').replace('.usdz', '-room.json')
        : null;
      
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
        json_path: jsonPath
      };
    }) || [];

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
