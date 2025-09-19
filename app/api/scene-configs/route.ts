import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { UserSceneConfig } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { data: configs, error } = await supabase
      .from('user_scene_configs')
      .select('*')
      .eq('user_id', user.id)
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
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { config_name, ...configData } = body

    // Check if config name already exists for this user
    const { data: existingConfig } = await supabase
      .from('user_scene_configs')
      .select('id')
      .eq('user_id', user.id)
      .eq('config_name', config_name)
      .single()

    if (existingConfig) {
      return NextResponse.json({ error: 'Config name already exists' }, { status: 400 })
    }

    const { data: newConfig, error } = await supabase
      .from('user_scene_configs')
      .insert({
        user_id: user.id,
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
