import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServerSupabase() {
  const url = process.env.SUPABASE_SERVER_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_SERVER_URL/NEXT_PUBLIC_SUPABASE_URL or SERVICE_ROLE_KEY')
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

export async function GET() {
  try {
    const supabase = getServerSupabase()
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, first_name, last_name, role')
      .eq('role', 'architect')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const profiles = (data || [])

    // Fetch emails from auth.users using service role
    const ids = profiles.map((p: any) => p.user_id)
    let emailById: Record<string, string | null> = {}
    if (ids.length > 0) {
      const { data: usersData, error: usersErr } = await supabase
        .from('auth.users')
        .select('id, email')
        .in('id', ids)
      if (!usersErr && usersData) {
        for (const u of usersData as any[]) {
          emailById[u.id] = u.email ?? null
        }
      }
    }

    const architects = profiles.map((u: any) => ({
      user_id: u.user_id,
      email: emailById[u.user_id] ?? null,
      name: [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || emailById[u.user_id] || u.user_id
    }))

    return NextResponse.json({ architects }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}


