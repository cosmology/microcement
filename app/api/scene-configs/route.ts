import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { UserSceneConfig } from '@/lib/supabase'
import { AuthService } from '@/lib/services/AuthService'

export async function GET(request: NextRequest) {
  try {
    const authResult = await AuthService.authenticateRequest(request.headers)
    if (!authResult.ok) {
      const message = authResult.reason === 'missing-authorization' ? 'No authorization header' : 'Invalid token'
      return NextResponse.json({ error: message }, { status: authResult.status })
    }

    const { userId } = authResult.identity

    const { data: configs, error } = await supabase
      .from('user_scene_configs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ configs })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await AuthService.authenticateRequest(request.headers)
    if (!authResult.ok) {
      const message = authResult.reason === 'missing-authorization' ? 'No authorization header' : 'Invalid token'
      return NextResponse.json({ error: message }, { status: authResult.status })
    }

    const { userId } = authResult.identity

    const body = await request.json()
    const { config_name, ...configData } = body

    // Check if config name already exists for this user
    const { data: existingConfig } = await supabase
      .from('user_scene_configs')
      .select('id')
      .eq('user_id', userId)
      .eq('config_name', config_name)
      .single()

    if (existingConfig) {
      return NextResponse.json({ error: 'Config name already exists' }, { status: 400 })
    }

    const { data: newConfig, error } = await supabase
      .from('user_scene_configs')
      .insert({
        user_id: userId,
        config_name: config_name || 'default',
        ...configData
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ config: newConfig }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
