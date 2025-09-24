'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { SceneConfigService } from '@/lib/services/SceneConfigService'

interface AuthHandlerProps {
  onUserChange?: (user: any) => void
}

export default function AuthHandler({ onUserChange }: AuthHandlerProps) {
  useEffect(() => {
    const handleAuthStateChange = async (event: string, session: any) => {
      console.log('Auth state changed:', event, session?.user?.email)
      
      // On sign-in, we no longer auto-create default configs. Just notify parent.
      
      // Notify parent component of user change
      onUserChange?.(session?.user ?? null)
    }

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange)

    return () => {
      subscription.unsubscribe()
    }
  }, [onUserChange])

  return null // This component doesn't render anything
}
