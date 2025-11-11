import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export type UserRole = 'admin' | 'architect' | 'end_user' | 'guest'

interface UserProfile {
  user_id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  role: UserRole
  company: string | null
  phone: string | null
  avatar_url: string | null
  created_at: string | null
  updated_at: string | null
}

interface UserProfileState {
  // State
  user: any | null
  profile: UserProfile | null
  role: UserRole
  loading: boolean
  error: string | null
  
  // Actions
  setUser: (user: any) => void
  setProfile: (profile: UserProfile | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  signOut: () => void
  
  // Computed
  isAuthenticated: boolean
  displayName: string
}

export const useUserProfileStore = create<UserProfileState>()(
  devtools(
    (set, get) => ({
      // Initial state
      user: null,
      profile: null,
      role: 'guest',
      loading: true,
      error: null,
      isAuthenticated: false,
      displayName: 'Guest',
      
      // Actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      setProfile: (profile) => set({ 
        profile, 
        role: profile?.role || 'guest',
        displayName: profile 
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email || 'User'
          : 'Guest'
      }),
      
      setLoading: (loading) => set({ loading }),
      
      setError: (error) => set({ error }),
      
      signOut: () => set({
        user: null,
        profile: null,
        role: 'guest',
        isAuthenticated: false,
        displayName: 'Guest',
        error: null
      }),
    }),
    { name: 'UserProfileStore' }
  )
)

