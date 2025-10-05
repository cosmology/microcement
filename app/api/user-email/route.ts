import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId parameter required' }, { status: 400 })
    }

    // Get user email from auth.users table
    const { data: authUser, error } = await supabase
      .from('auth.users')
      .select('email')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user email:', error)
      return NextResponse.json({ error: 'Failed to fetch user email' }, { status: 500 })
    }

    return NextResponse.json({ email: authUser?.email })
  } catch (error) {
    console.error('Error in user-email API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
