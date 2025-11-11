import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { AuthService } from '@/lib/services/AuthService'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await AuthService.authenticateRequest(request.headers)
    if (!authResult.ok) {
      const message = authResult.reason === 'missing-authorization' ? 'No authorization header' : 'Invalid token'
      return NextResponse.json({ error: message }, { status: authResult.status })
    }

    const { userId } = authResult.identity

    const { data: config, error } = await supabase
      .from('user_scene_configs')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json({ config })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await AuthService.authenticateRequest(request.headers)
    if (!authResult.ok) {
      const message = authResult.reason === 'missing-authorization' ? 'No authorization header' : 'Invalid token'
      return NextResponse.json({ error: message }, { status: authResult.status })
    }

    const { userId } = authResult.identity

    const body = await request.json()
    const { config_name, ...configData } = body

    // If updating config name, check if it already exists
    if (config_name) {
      const { data: existingConfig } = await supabase
        .from('user_scene_configs')
        .select('id')
        .eq('user_id', userId)
        .eq('config_name', config_name)
        .neq('id', params.id)
        .single()

      if (existingConfig) {
        return NextResponse.json({ error: 'Config name already exists' }, { status: 400 })
      }
    }

    const { data: updatedConfig, error } = await supabase
      .from('user_scene_configs')
      .update({
        ...(config_name && { config_name }),
        ...configData
      })
      .eq('id', params.id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ config: updatedConfig })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await AuthService.authenticateRequest(request.headers)
    if (!authResult.ok) {
      const message = authResult.reason === 'missing-authorization' ? 'No authorization header' : 'Invalid token'
      return NextResponse.json({ error: message }, { status: authResult.status })
    }

    const { userId } = authResult.identity

    const { error } = await supabase
      .from('user_scene_configs')
      .delete()
      .eq('id', params.id)
      .eq('user_id', userId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Config deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
