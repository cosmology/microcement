'use client'

import { useState, useEffect, useRef } from 'react'
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

  const userRef = useRef<any | null>(null)
  const profileRef = useRef<any | null>(null)

  const role: UserRole = profile?.role || 'guest'

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        console.info('[useUserRole] Loading profile')
        console.info('[useUserRole] NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL)
        console.info('[useUserRole] window override', typeof window !== 'undefined' ? (window as any).__SUPABASE_URL_OVERRIDE__ : 'n/a')

        if (typeof window !== 'undefined') {
          const override = (window as any).__PLAYWRIGHT_ROLE_OVERRIDE__
          if (override?.role) {
            console.info('[useUserRole] Applying Playwright role override', override.role)
            setUser(override.user ?? null)
            setProfile(override.profile ?? { role: override.role })
            setLoading(false)
            return
          }
        }
        // Add timeout to prevent hanging - increased to 20 seconds for fresh container startup
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('User profile loading timeout')), 20000) // 20 second timeout
        })
        
        const profilePromise = (async () => {
          const { data: { session } } = await supabase.auth.getSession()
          
          if (session?.user) {
            console.info('[useUserRole] Session user found', session.user.id)
            // Load user profile from database
            const userProfileService = UserProfileService.getInstance()
            const userWithProfile = await userProfileService.getUserWithProfile(session.user)
            
            console.info('[useUserRole] Loaded profile', userWithProfile.profile?.role)
            if (!userWithProfile.profile) {
              console.info('[useUserRole] No profile returned during initial load, defaulting to guest')
            }
            setUser(userWithProfile.auth)
            setProfile(userWithProfile.profile)
          } else {
            console.info('[useUserRole] No session user')
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
        console.info('[useUserRole] loadUserProfile falling back to guest due to error', { error: errorMessage })
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
      console.info('[useUserRole] Auth change event', {
        event,
        hasSession: Boolean(session?.user)
      })
      if (session?.user) {
        try {
          if (typeof window !== 'undefined') {
            const override = (window as any).__PLAYWRIGHT_ROLE_OVERRIDE__
            if (override?.role) {
              console.info('[useUserRole] Auth change applying Playwright override', override.role)
              setUser(override.user ?? session.user)
              setProfile(override.profile ?? { role: override.role })
              setLoading(false)
              return
            }
          }

          // Add timeout to prevent hanging - increased to 20 seconds to match initial load
          // This is especially important for Docker containers that may have slower startup
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Auth state change timeout')), 20000) // 20 second timeout
          })
          
          const profilePromise = (async () => {
            const userProfileService = UserProfileService.getInstance()
            const userWithProfile = await userProfileService.getUserWithProfile(session.user)

            console.info('[useUserRole] Auth change received profile', {
              userId: userWithProfile.auth?.id,
              profileRole: userWithProfile.profile?.role,
              profileExists: Boolean(userWithProfile.profile)
            })

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
          console.info('[useUserRole] Auth change fallback to user without profile', {
            userId: session.user.id,
            reason: errorMessage
          })
          setUser(session.user)
          setProfile(null)
        }
      } else {
        if (typeof window !== 'undefined') {
          const override = (window as any).__PLAYWRIGHT_ROLE_OVERRIDE__
          if (override?.role) {
            console.info('[useUserRole] Auth change re-applying Playwright override without session', override.role)
            setUser(override.user ?? null)
            setProfile(override.profile ?? { role: override.role })
            setLoading(false)
            return
          }
        }

        if (event === 'INITIAL_SESSION') {
          console.info('[useUserRole] Ignoring empty INITIAL_SESSION event', {
            hasExistingUser: Boolean(userRef.current),
            hasExistingProfile: Boolean(profileRef.current)
          })
          setLoading(false)
          return
        }

        console.info('[useUserRole] Clearing user/profile due to auth event with no session', { event })
        console.info('[useUserRole] Auth change received no session, clearing user/profile')
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

  useEffect(() => {
    userRef.current = user
    profileRef.current = profile

    console.info('[useUserRole] State updated', {
      userId: user?.id,
      role,
      loading,
      hasProfile: Boolean(profile)
    })
    if (typeof window !== 'undefined') {
      (window as any).__USER_ROLE_STATE__ = {
        user,
        profile,
        role,
        loading,
      }
    }
  }, [user, profile, role, loading])

  return {
    user,
    role,
    profile,
    loading
  }
}
