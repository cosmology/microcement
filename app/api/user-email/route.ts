import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { AuthService } from '@/lib/services/AuthService'

export async function GET(request: NextRequest) {
  try {
    const authResult = await AuthService.authenticateRequest(request.headers)
    if (!authResult.ok) {
      const message = authResult.reason === 'missing-authorization' ? 'No authorization header' : 'Invalid token'
      return NextResponse.json({ error: message }, { status: authResult.status })
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
