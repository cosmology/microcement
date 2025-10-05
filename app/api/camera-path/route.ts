import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_SERVER_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  console.log('🔍 [API] Camera path GET request received')
    console.log('🔍 [API] Environment check:', {
      supabaseUrl: process.env.SUPABASE_SERVER_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SERVICE_ROLE_KEY
    })
  
  try {

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const sceneDesignConfigId = searchParams.get('sceneDesignConfigId')

    if (!userId || !sceneDesignConfigId) {
      console.log('❌ [API] Missing parameters:', { userId, sceneDesignConfigId })
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    console.log('🔍 [API] Loading camera path for user:', userId, 'scene:', sceneDesignConfigId)

    // Query the scene_follow_paths table for the 'current' path
    const { data, error } = await supabase
      .from('scene_follow_paths')
      .select('*')
      .eq('scene_design_config_id', sceneDesignConfigId)
      .eq('path_name', 'current')
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('❌ [API] Supabase error:', error)
      console.log('🔄 [API] Returning default camera path data due to database error')
      
      // Return default camera path data when database fails
      const defaultCameraPoints = [
        { x: 20, y: 5, z: 0 },
        { x: -8, y: 6.5, z: 2 },
        { x: -14, y: 6.75, z: 7 },
        { x: -8, y: 7, z: 24 },
        { x: -4, y: 7, z: 30 },
        { x: -2, y: 7.25, z: 32 },
        { x: 12, y: 7.5, z: 32 },
        { x: 20, y: 8, z: 25 },
        { x: 16, y: 8, z: 0 }
      ]
      
      const defaultLookAtTargets = [
        { x: 0, y: 0, z: 0 },
        { x: 4, y: 3, z: 0 },
        { x: 6, y: 4, z: 0 },
        { x: 7, y: 5, z: 30 },
        { x: 10, y: 6, z: 50 },
        { x: 20, y: 7, z: 60 },
        { x: 30, y: 8, z: 40 },
        { x: 30, y: 8, z: 20 },
        { x: 0, y: 8, z: -40 }
      ]
      
      return NextResponse.json({
        cameraPoints: defaultCameraPoints,
        lookAtTargets: defaultLookAtTargets,
        pathId: 'default-path'
      })
    }

    if (!data) {
      console.log('⚠️ [API] No camera path found for user:', userId)
      return NextResponse.json(
        { error: 'No camera path found' },
        { status: 404 }
      )
    }

    console.log('✅ [API] Found camera path with', data.camera_points?.length || 0, 'points')

    return NextResponse.json({
      cameraPoints: data.camera_points || [],
      lookAtTargets: data.look_at_targets || [],
      pathId: data.id
    })

  } catch (error) {
    console.error('❌ [API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Validate server env early
    if (!process.env.SERVICE_ROLE_KEY) {
      console.error('❌ [API] Missing SERVICE_ROLE_KEY in environment')
      return NextResponse.json(
        { error: 'Server misconfiguration: SERVICE_ROLE_KEY missing' },
        { status: 500 }
      )
    }

    // Parse JSON body defensively
    let body: any
    try {
      body = await request.json()
    } catch (e: any) {
      console.error('❌ [API] Failed to parse JSON body:', e?.message || e)
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { userId, sceneDesignConfigId, cameraPoints, lookAtTargets } = body || {}

    if (!userId || !sceneDesignConfigId || !cameraPoints) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('💾 [API] Saving camera path for user:', userId, 'scene:', sceneDesignConfigId, 'points:', Array.isArray(cameraPoints) ? cameraPoints.length : 'n/a')

    // Authorization: ensure the caller owns or is related to this scene config
    const { data: ownerCheck, error: ownerError } = await supabase
      .from('scene_design_configs')
      .select('id,user_id,architect_id,client_id')
      .eq('id', sceneDesignConfigId)
      .single()

    if (ownerError || !ownerCheck) {
      console.warn('⚠️ [API] Scene config not found or fetch error', ownerError)
      return NextResponse.json({ error: 'Scene config not found' }, { status: 404 })
    }

    const isAuthorized = [ownerCheck.user_id, ownerCheck.architect_id, ownerCheck.client_id]
      .filter(Boolean)
      .includes(userId)

    if (!isAuthorized) {
      console.warn('🚫 [API] Unauthorized attempt to modify camera path', {
        userId,
        sceneDesignConfigId
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Basic input validation and normalization
    const normPoints = Array.isArray(cameraPoints) ? cameraPoints.map((p: any) => ({
      x: Number(p?.x ?? 0), y: Number(p?.y ?? 0), z: Number(p?.z ?? 0)
    })) : []
    const normLooks = Array.isArray(lookAtTargets) ? lookAtTargets.map((p: any) => ({
      x: Number(p?.x ?? 0), y: Number(p?.y ?? 0), z: Number(p?.z ?? 0)
    })) : []

    // Upsert the camera path data using the composite unique constraint
    const { data, error } = await supabase
      .from('scene_follow_paths')
      .upsert({
        scene_design_config_id: sceneDesignConfigId,
        path_name: 'current', // Use a default path name
        camera_points: cameraPoints,
        look_at_targets: lookAtTargets || [],
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'scene_design_config_id,path_name'
      })
      .select()
      .single()

    if (error) {
      console.error('❌ [API] Supabase upsert error:', {
        message: (error as any)?.message,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
        code: (error as any)?.code
      })
      return NextResponse.json(
        { error: 'Failed to save camera path', details: (error as any)?.message || 'Unknown error' },
        { status: 500 }
      )
    }

    console.log('✅ [API] Successfully saved camera path')

    return NextResponse.json({
      success: true,
      pathId: data.id
    })

  } catch (error) {
    console.error('❌ [API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
