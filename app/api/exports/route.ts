import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sceneId, usdzPath, userId, jsonPath } = body;

    if (!sceneId || !usdzPath) {
      return NextResponse.json(
        { error: 'sceneId and usdzPath are required' },
        { status: 400 }
      );
    }

    // Validate UUID format if userId is provided
    if (userId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        return NextResponse.json(
          { error: 'Invalid user ID format. Must be a valid UUID.' },
          { status: 400 }
        );
      }
    }

    // Insert metadata row
    const { data, error } = await supabaseAdmin
      .from('exports')
      .insert({
        user_id: userId || null,
        scene_id: sceneId,
        usdz_path: usdzPath,
        json_path: jsonPath || null,
        status: 'queued'
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Trigger background convert function
    const baseUrlEnv = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    const baseUrl = baseUrlEnv.startsWith('http') ? baseUrlEnv : `https://${baseUrlEnv}`;
    const bgUrl = `${baseUrl.replace(/\/+$/, '')}/api/background/convert`;

    // Fire-and-forget: don't await the background function
    fetch(bgUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-role': process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      },
      body: JSON.stringify({ exportId: data.id })
    }).catch((e) => {
      console.error('Background function trigger failed:', e);
    });

    return NextResponse.json({
      message: 'Export queued successfully',
      id: data.id,
      status: data.status
    }, { status: 202 });

  } catch (error) {
    console.error('Export API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

