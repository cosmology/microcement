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
      
      if (event === 'SIGNED_IN' && session?.user) {
        // User just signed in, create default scene config if needed
        try {
          const sceneConfigService = SceneConfigService.getInstance()
          sceneConfigService.setUser({ id: session.user.id })
          
          // Check if user already has configs
          const existingConfigs = await sceneConfigService.getUserConfigs()
          
          if (existingConfigs.length === 0) {
            console.log('Creating default scene config for new user:', session.user.email)
            
            // Create default scene config
            await sceneConfigService.createDefaultConfigIfNotExists()
            console.log('Default scene config created successfully')
          } else {
            console.log('User already has scene configs:', existingConfigs.length)
          }
        } catch (error) {
          console.error('Error creating default scene config:', error)
        }
      }
      
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
