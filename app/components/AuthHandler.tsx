'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { SceneConfigService } from '@/lib/services/SceneConfigService'

interface AuthHandlerProps {
  onUserChange?: (user: any) => void
}

export default function AuthHandler({ onUserChange }: AuthHandlerProps) {
  useEffect(() => {
    console.log('🎧 [EVENT LISTENER] Registered: Supabase auth state change');
    
    const handleAuthStateChange = async (event: string, session: any) => {
      console.log('🔐 [AuthHandler] Auth state changed:', event, session?.user?.email)
      
      // On sign-in, we no longer auto-create default configs. Just notify parent.
      
      // Notify parent component of user change
      onUserChange?.(session?.user ?? null)
    }

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange)

    return () => {
      console.log('🔌 [EVENT LISTENER] Removed: Supabase auth state change');
      subscription.unsubscribe()
    }
  }, []) // ✅ CRITICAL FIX: Remove onUserChange from deps to prevent infinite loop

  return null // This component doesn't render anything
}
