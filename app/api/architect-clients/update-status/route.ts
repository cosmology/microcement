import { NextRequest, NextResponse } from 'next/server'
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

/**
 * Update architect_clients relationship status
 * Used to transition projects through the workflow:
 * PENDING_ARCHITECT → IN_PROGRESS → PENDING_REVIEW → ACTIVE
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { relationshipId, status } = body

    if (!relationshipId || !status) {
      return NextResponse.json({ 
        error: 'Missing relationshipId or status' 
      }, { status: 400 })
    }

    // Validate status
    const validStatuses = [
      'pending_upload',
      'pending_architect', 
      'in_progress', 
      'pending_review', 
      'active', 
      'completed', 
      'on_hold', 
      'cancelled'
    ]

    if (!validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      }, { status: 400 })
    }

    console.log('🔄 [Update Status API] Updating relationship:', relationshipId, 'to status:', status)

    const supabase = getServerSupabase()

    // Update the relationship status
    const { data, error } = await supabase
      .from('architect_clients')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', relationshipId)
      .select()
      .single()

    if (error) {
      console.error('❌ [Update Status API] Error:', error)
      return NextResponse.json({ 
        error: 'Failed to update status',
        details: error.message 
      }, { status: 500 })
    }

    console.log('✅ [Update Status API] Status updated successfully:', data)

    return NextResponse.json({ 
      success: true,
      data
    }, { status: 200 })

  } catch (error: any) {
    console.error('❌ [Update Status API] Error:', error)
    return NextResponse.json({ 
      error: error?.message || 'Failed to update status' 
    }, { status: 500 })
  }
}

