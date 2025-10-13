'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { UserProfileService, UserWithProfile } from '@/lib/services/UserProfileService'

export type UserRole = 'admin' | 'architect' | 'end_user' | 'guest'

export interface UserRoleInfo {
  user: any | null
  role: UserRole
  profile: any | null
  loading: boolean
}

export function useUserRole(): UserRoleInfo {
  const [user, setUser] = useState<any | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  const role: UserRole = profile?.role || 'guest'

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        // Add timeout to prevent hanging - increased to 20 seconds for fresh container startup
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('User profile loading timeout')), 20000) // 20 second timeout
        })
        
        const profilePromise = (async () => {
          const { data: { session } } = await supabase.auth.getSession()
          
          if (session?.user) {
            // Load user profile from database
            const userProfileService = UserProfileService.getInstance()
            const userWithProfile = await userProfileService.getUserWithProfile(session.user)
            
            setUser(userWithProfile.auth)
            setProfile(userWithProfile.profile)
          } else {
          }
        })()
        
        await Promise.race([profilePromise, timeoutPromise])
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        if (errorMessage.includes('timeout')) {
          console.warn('⚠️ [useUserRole] Profile loading timeout - continuing as guest')
        } else {
          console.error('❌ [useUserRole] Failed to load user profile:', error)
        }
        // Continue as guest on error
        setUser(null)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    loadUserProfile()

    // Fallback timeout to ensure loading is always cleared
    const fallbackTimeout = setTimeout(() => {
      console.warn('⚠️ [useUserRole] Fallback timeout - clearing loading state')
      setLoading(false)
    }, 30000) // 30 second fallback timeout (longer than main timeout)

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          // Add timeout to prevent hanging - increased to 20 seconds to match initial load
          // This is especially important for Docker containers that may have slower startup
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Auth state change timeout')), 20000) // 20 second timeout
          })
          
          const profilePromise = (async () => {
            const userProfileService = UserProfileService.getInstance()
            const userWithProfile = await userProfileService.getUserWithProfile(session.user)
            
            setUser(userWithProfile.auth)
            setProfile(userWithProfile.profile)
          })()
          
          await Promise.race([profilePromise, timeoutPromise])
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          if (errorMessage.includes('timeout')) {
            console.warn('⚠️ [useUserRole] Profile loading timeout on auth change - continuing with fallback')
          } else {
            console.error('❌ [useUserRole] Failed to load user profile on auth change:', error)
          }
          // Set user without profile if profile loading fails (this is a valid fallback)
          setUser(session.user)
          setProfile(null)
        }
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
      clearTimeout(fallbackTimeout)
    }
  }, [])

  return {
    user,
    role,
    profile,
    loading
  }
}
