import { supabase } from '@/lib/supabase'

export interface UserProfile {
  id: string
  user_id: string
  role: 'admin' | 'architect' | 'end_user'
  first_name?: string
  last_name?: string
  company?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postal_code?: string
  bio?: string
  avatar_url?: string
  preferences?: Record<string, any>
  metadata?: Record<string, any>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AuthUser {
  id: string
  email?: string
  user_metadata?: Record<string, any>
  app_metadata?: Record<string, any>
  role?: string
  aud?: string
  created_at?: string
  email_confirmed_at?: string
  last_sign_in_at?: string
  phone?: string
  updated_at?: string
}

export interface UserWithProfile {
  auth: AuthUser
  profile: UserProfile | null
}

export class UserProfileService {
  private static instance: UserProfileService
  private profileCache = new Map<string, UserProfile>()
  private pendingRequests = new Map<string, Promise<UserProfile | null>>()

  private constructor() {}

  public static getInstance(): UserProfileService {
    if (!UserProfileService.instance) {
      UserProfileService.instance = new UserProfileService()
    }
    return UserProfileService.instance
  }

  /**
   * Get user profile from database by user ID
   */
  public async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      // Check cache first
      const cached = this.profileCache.get(userId)
      if (cached) {
        console.log('🔍 [UserProfileService] Using cached profile for user:', userId)
        return cached
      }

      // Check if request is already pending
      const pending = this.pendingRequests.get(userId)
      if (pending) {
        console.log('🔍 [UserProfileService] Waiting for pending request for user:', userId)
        return pending
      }

      // Create new request
      const promise = this.fetchUserProfile(userId)
      this.pendingRequests.set(userId, promise)

      const result = await promise
      this.pendingRequests.delete(userId)

      if (result) {
        this.profileCache.set(userId, result)
      }

      return result
    } catch (error) {
      console.error('❌ [UserProfileService] Failed to get user profile:', error)
      this.pendingRequests.delete(userId)
      return null
    }
  }

  /**
   * Fetch user profile from database
   */
  private async fetchUserProfile(userId: string): Promise<UserProfile | null> {
    console.log('🔍 [UserProfileService] Fetching profile from database for user:', userId)

    try {
      const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found - this could be due to RLS or missing profile
          console.log('⚠️ [UserProfileService] No profile found or access denied for user:', userId)
          console.log('🔍 [UserProfileService] Error details:', error)
          return null
        }
        console.error('❌ [UserProfileService] Database error:', error)
        throw error
      }

      console.log('✅ [UserProfileService] Profile loaded:', {
        id: data.id,
        role: data.role,
        name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
        email: userId
      })

      return data as UserProfile
    } catch (error) {
      console.error('❌ [UserProfileService] Unexpected error in fetchUserProfile:', error)
      return null
    }
  }

  /**
   * Get complete user data (auth + profile)
   */
  public async getUserWithProfile(authUser: AuthUser): Promise<UserWithProfile> {
    const profile = await this.getUserProfile(authUser.id)
    
    return {
      auth: authUser,
      profile
    }
  }

  /**
   * Create user profile (for new users)
   */
  public async createUserProfile(
    userId: string, 
    profileData: Partial<UserProfile>
  ): Promise<UserProfile | null> {
    try {
      console.log('🔍 [UserProfileService] Creating profile for user:', userId)

      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          role: 'end_user', // Default role
          ...profileData
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      console.log('✅ [UserProfileService] Profile created:', data.id)
      
      // Update cache
      this.profileCache.set(userId, data as UserProfile)
      
      return data as UserProfile
    } catch (error) {
      console.error('❌ [UserProfileService] Failed to create user profile:', error)
      return null
    }
  }

  /**
   * Update user profile
   */
  public async updateUserProfile(
    userId: string, 
    updates: Partial<UserProfile>
  ): Promise<UserProfile | null> {
    try {
      console.log('🔍 [UserProfileService] Updating profile for user:', userId)

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        throw error
      }

      console.log('✅ [UserProfileService] Profile updated:', data.id)
      
      // Update cache
      this.profileCache.set(userId, data as UserProfile)
      
      return data as UserProfile
    } catch (error) {
      console.error('❌ [UserProfileService] Failed to update user profile:', error)
      return null
    }
  }

  /**
   * Clear cache for a user
   */
  public clearUserCache(userId: string): void {
    this.profileCache.delete(userId)
    this.pendingRequests.delete(userId)
  }

  /**
   * Clear all cache
   */
  public clearAllCache(): void {
    this.profileCache.clear()
    this.pendingRequests.clear()
  }

  /**
   * Get user role
   */
  public async getUserRole(userId: string): Promise<'admin' | 'architect' | 'end_user' | null> {
    const profile = await this.getUserProfile(userId)
    return profile?.role || null
  }

  /**
   * Check if user has specific role
   */
  public async hasRole(
    userId: string, 
    role: 'admin' | 'architect' | 'end_user'
  ): Promise<boolean> {
    const userRole = await this.getUserRole(userId)
    return userRole === role
  }

  /**
   * Check if user is admin
   */
  public async isAdmin(userId: string): Promise<boolean> {
    return this.hasRole(userId, 'admin')
  }

  /**
   * Check if user is architect
   */
  public async isArchitect(userId: string): Promise<boolean> {
    return this.hasRole(userId, 'architect')
  }

  /**
   * Check if user is end user
   */
  public async isEndUser(userId: string): Promise<boolean> {
    return this.hasRole(userId, 'end_user')
  }
}
