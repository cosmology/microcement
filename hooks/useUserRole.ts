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
        // Add timeout to prevent hanging - reduced to 5 seconds
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('User profile loading timeout')), 5000) // 5 second timeout
        })
        
        const profilePromise = (async () => {
          console.log('🔐 [useUserRole] Starting initial profile load...')
          const { data: { session } } = await supabase.auth.getSession()
          
          if (session?.user) {
            console.log('🔐 [useUserRole] Session found, loading profile for:', session.user.email)
            // Load user profile from database
            const userProfileService = UserProfileService.getInstance()
            const userWithProfile = await userProfileService.getUserWithProfile(session.user)
            
            setUser(userWithProfile.auth)
            setProfile(userWithProfile.profile)
            
            console.log('🔐 [useUserRole] User role loaded successfully:', {
              email: userWithProfile.auth.email,
              role: userWithProfile.profile?.role || 'guest',
              profile: userWithProfile.profile
            })
          } else {
            console.log('🔐 [useUserRole] No session found during initial load')
          }
        })()
        
        await Promise.race([profilePromise, timeoutPromise])
      } catch (error) {
        console.error('Failed to load user profile:', error)
        // Set loading to false even on error to prevent infinite loading
        setLoading(false)
      } finally {
        setLoading(false)
      }
    }

    loadUserProfile()

    // Fallback timeout to ensure loading is always cleared
    const fallbackTimeout = setTimeout(() => {
      console.warn('⚠️ [useUserRole] Fallback timeout - clearing loading state')
      setLoading(false)
    }, 8000) // 8 second fallback timeout

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          // Add timeout to prevent hanging - reduced to 5 seconds
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Auth state change timeout')), 5000) // 5 second timeout
          })
          
          const profilePromise = (async () => {
            console.log('🔐 [useUserRole] Loading user profile for auth change...')
            const userProfileService = UserProfileService.getInstance()
            const userWithProfile = await userProfileService.getUserWithProfile(session.user)
            
            setUser(userWithProfile.auth)
            setProfile(userWithProfile.profile)
            
            console.log('🔐 [useUserRole] Auth state changed successfully:', {
              event,
              email: userWithProfile.auth.email,
              role: userWithProfile.profile?.role || 'guest'
            })
          })()
          
          await Promise.race([profilePromise, timeoutPromise])
        } catch (error) {
          console.error('Failed to load user profile on auth change:', error)
          // Set user without profile if profile loading fails
          setUser(session.user)
          setProfile(null)
          console.log('🔐 [useUserRole] Auth state changed with fallback (no profile):', {
            event,
            email: session.user.email,
            role: 'guest'
          })
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
