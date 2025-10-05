'use client'

import { useState, useEffect, useRef } from 'react'
import { UserRound, LogOut, Settings, Camera, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PasswordInput } from '@/components/ui/password-input'
import { supabase } from '@/lib/supabase'
import { SceneConfigService } from '@/lib/services/SceneConfigService'
import { UserProfileService, UserWithProfile } from '@/lib/services/UserProfileService'
import { useTranslations } from 'next-intl'
import { WAYPOINTS, dispatchGoToWaypoint } from '@/lib/scene/waypoints'

interface UserProfileProps {
  onUserChange?: (user: any) => void
  forceShowAuth?: boolean
}

export default function UserProfile({ onUserChange, forceShowAuth = false }: UserProfileProps) {
  const [user, setUser] = useState<any>(null)
  const [userWithProfile, setUserWithProfile] = useState<UserWithProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(forceShowAuth)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authInfo, setAuthInfo] = useState('')
  
  // Follow Path state
  const [followPaths, setFollowPaths] = useState<Array<{id: string, path_name: string, is_active: boolean, camera_points?: any, look_at_targets?: any}>>([])
  const [selectedFollowPath, setSelectedFollowPath] = useState<string>("current")
  const [loadingPaths, setLoadingPaths] = useState(false)
  const [showFollowPathDropdown, setShowFollowPathDropdown] = useState(false)
  // Align dropdown panel with header bottom
  const [headerBottom, setHeaderBottom] = useState<number>(64)
  const rafRef = useRef<number | null>(null)
  
  const t = useTranslations('Navigation')

  // Compute header bottom offset so dropdown aligns with header bottom border
  useEffect(() => {
    const computeOffset = () => {
      try {
        const nav = document.querySelector('nav') as HTMLElement | null
        if (!nav) { setHeaderBottom(64); return }
        const rect = nav.getBoundingClientRect()
        const offset = rect.bottom > 0 ? Math.round(rect.bottom) : 64
        setHeaderBottom(offset)
      } catch {
        setHeaderBottom(64)
      }
    }
    computeOffset()
    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(computeOffset)
    }
    const onResize = () => computeOffset()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    const nav = document.querySelector('nav')
    const obs = new MutationObserver(() => computeOffset())
    if (nav) obs.observe(nav, { attributes: true, attributeFilter: ['style', 'class'] })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      obs.disconnect()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // Load follow paths when user changes
  useEffect(() => {
    const loadFollowPaths = async () => {
      if (!user?.id) {
        setFollowPaths([]);
        return;
      }

      setLoadingPaths(true);
      try {
        const sceneConfigService = SceneConfigService.getInstance();
        sceneConfigService.setUser(user);
        
        // Get user's default scene config
        const userConfig = await sceneConfigService.getDefaultConfig();
        if (!userConfig) {
          console.log('❌ No user config found for user:', user.id);
          setFollowPaths([]);
          return;
        }

        console.log('✅ User config found:', userConfig.id);

        // Get all follow paths for this config
        const paths = await sceneConfigService.getAllFollowPathsForConfig(userConfig.id);
        console.log('📊 Follow paths loaded:', paths.length, 'paths');
        console.log('📊 Follow paths data:', paths);
        
        setFollowPaths(paths);
        
        // Set the active path as selected
        const activePath = paths.find(p => p.is_active);
        if (activePath) {
          console.log('🎯 Active path found:', activePath.path_name);
          setSelectedFollowPath(activePath.path_name);
        } else {
          console.log('⚠️ No active path found');
        }
        
      } catch (error) {
        console.error('❌ Failed to load follow paths:', error);
        setFollowPaths([]);
      } finally {
        setLoadingPaths(false);
      }
    };

    loadFollowPaths();
  }, [user]);

  // Follow path options for display
  const followPathOptions = followPaths.map(path => ({
    id: path.path_name,
    name: t(path.path_name === 'current' ? 'showcaseArea' : 
           path.path_name === 'bathroom_walkthrough' ? 'bathroom' :
           path.path_name === 'kitchen_tour' ? 'kitchen' :
           path.path_name === 'living_room_tour' ? 'livingRoom' :
           path.path_name === 'bedroom_area' ? 'bedroomArea' :
           path.path_name === 'office_space' ? 'officeSpace' : path.path_name)
  }));

  // Dispatch follow path selection
  const dispatchFollowPath = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🎬 dispatchFollowPath called with id:', id);
    console.log('🎬 Available followPaths:', followPaths);
    
    setSelectedFollowPath(id)
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[UserProfile] Follow path selected:', id);
    }
    
    // Find the selected path data
    const selectedPath = followPaths.find(p => p.path_name === id);
    console.log('🎬 Selected path found:', selectedPath);
    
    if (selectedPath) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[UserProfile] dispatching path data:', {
          id: selectedPath.id,
          path_name: selectedPath.path_name,
          camera_points: selectedPath.camera_points?.length || 0,
          is_active: selectedPath.is_active
        });
      }
      
      // Console out current camera point and look-at target for Current Path
      if (id === 'current') {
        const currentCameraPoint = selectedPath.camera_points?.[0];
        const currentLookAtTarget = selectedPath.look_at_targets?.[0];
        console.log('🎬 Current Camera Point:', currentCameraPoint);
        console.log('👁️ Current Look-At Target:', currentLookAtTarget);
      }
      
      // Dispatch detailed event with path data
      window.dispatchEvent(new CustomEvent("follow-path-select", { 
        detail: { 
          id: selectedPath.path_name,
          pathId: selectedPath.id,
          cameraPoints: selectedPath.camera_points,
          lookAtTargets: selectedPath.look_at_targets,
          isActive: selectedPath.is_active
        } 
      }));
    } else {
      console.log('❌ No selected path found for id:', id);
    }
    
    setShowFollowPathDropdown(false);
  };

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          console.log('🔐 [UserProfile] Initial auth check - Full user metadata:', {
            user: session.user,
            user_metadata: session.user.user_metadata,
            app_metadata: session.user.app_metadata,
            aud: session.user.aud,
            created_at: session.user.created_at,
            email: session.user.email,
            email_confirmed_at: session.user.email_confirmed_at,
            id: session.user.id,
            last_sign_in_at: session.user.last_sign_in_at,
            phone: session.user.phone,
            role: session.user.role,
            updated_at: session.user.updated_at
          })

          // Load user profile from database
          const userProfileService = UserProfileService.getInstance()
          const userWithProfile = await userProfileService.getUserWithProfile(session.user)
          setUserWithProfile(userWithProfile)
          
          console.log('🔐 [UserProfile] User with profile loaded:', {
            auth: userWithProfile.auth,
            profile: userWithProfile.profile,
            role: userWithProfile.profile?.role || 'no profile'
          })
        }
        setUser(session?.user ?? null)
        onUserChange?.(session?.user ?? null)
      } catch (error) {
        console.error('Auth check failed:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        console.log('🔐 [UserProfile] User logged in - Full user metadata:', {
          user: session.user,
          user_metadata: session.user.user_metadata,
          app_metadata: session.user.app_metadata,
          aud: session.user.aud,
          created_at: session.user.created_at,
          email: session.user.email,
          email_confirmed_at: session.user.email_confirmed_at,
          id: session.user.id,
          last_sign_in_at: session.user.last_sign_in_at,
          phone: session.user.phone,
          role: session.user.role,
          updated_at: session.user.updated_at
        })

        // Load user profile from database
        const userProfileService = UserProfileService.getInstance()
        const userWithProfile = await userProfileService.getUserWithProfile(session.user)
        setUserWithProfile(userWithProfile)
        
        console.log('🔐 [UserProfile] User with profile loaded on auth change:', {
          auth: userWithProfile.auth,
          profile: userWithProfile.profile,
          role: userWithProfile.profile?.role || 'no profile'
        })
      } else {
        // User logged out
        setUserWithProfile(null)
      }
      setUser(session?.user ?? null)
      onUserChange?.(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [onUserChange])

  // Handle forceShowAuth prop changes
  useEffect(() => {
    if (forceShowAuth) {
      setShowAuthModal(true)
    }
  }, [forceShowAuth])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      onUserChange?.(null)
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    setAuthInfo('')

    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        // Inform user to check inbox for confirmation link
        if (!error) {
          setAuthInfo(
            `We sent a confirmation link to ${email}. Please check your inbox to complete your registration.`
          )
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // Success will be handled by auth state change
      }
    } catch (error: any) {
      const rawMsg: string = error?.message || 'Authentication failed'
      if (error?.name === 'TypeError' && /Failed to fetch/i.test(rawMsg)) {
        setAuthError('Network error contacting auth service. Please retry in a moment.')
        console.error('Auth network error (signup/signin):', error)
        return
      }
      // Friendly error mapping
      if (/Invalid login credentials/i.test(rawMsg) || /invalid credentials/i.test(rawMsg)) {
        setAuthError('Invalid email or password. Please try again or sign up.')
      } else if (/FetchError|Failed to fetch|NetworkError/i.test(rawMsg)) {
        setAuthError('Unable to reach auth service. Please check your connection and retry.')
      } else if (/rate limit/i.test(rawMsg)) {
        setAuthError('Too many attempts. Please wait a moment and try again.')
      } else {
        setAuthError(rawMsg)
      }
    } finally {
      setAuthLoading(false)
    }
  }

  const openAuthModal = (mode: 'signin' | 'signup') => {
    setAuthMode(mode)
    setShowAuthModal(true)
    setAuthError('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <>
      {/* User Profile Icon */}
      <div className="relative">
        {!user ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openAuthModal('signin')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors duration-200 text-gray-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-400"
            title="Sign in to your account"
          >
            <UserRound className="h-5 w-5 text-current" />
          </Button>
        ) : (
          <div className="relative group">
            <Button
              variant="ghost"
              size="sm"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors duration-200 text-gray-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-400"
              title={`Signed in as ${user.email}`}
            >
              <UserRound className="h-5 w-5 text-current" />
            </Button>
            
            {/* Dropdown Menu aligned to header bottom */}
            <div className="fixed right-2 w-64 bg-white dark:bg-gray-900 backdrop-blur-sm shadow-lg border border-gray-200/50 dark:border-gray-700/50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[1105] rounded-lg"
                 style={{ top: '3rem' }}>
              <div className="p-3">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                    <UserRound className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{user.email}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Authenticated
                      </p>
                      {userWithProfile?.profile?.role && (
                        <Badge 
                          variant={
                            userWithProfile.profile.role === 'admin' ? 'destructive' :
                            userWithProfile.profile.role === 'architect' ? 'default' :
                            'secondary'
                          }
                          className="text-xs px-1.5 py-0.5"
                        >
                          {userWithProfile.profile.role}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Debug Profile Info */}
                {userWithProfile?.profile && (
                  <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs">
                    <p className="font-medium mb-1">Profile Details:</p>
                    <p>Name: {userWithProfile.profile.first_name} {userWithProfile.profile.last_name}</p>
                    <p>Company: {userWithProfile.profile.company || 'Not set'}</p>
                    <p>Active: {userWithProfile.profile.is_active ? 'Yes' : 'No'}</p>
                    <p>Created: {new Date(userWithProfile.profile.created_at).toLocaleDateString()}</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 py-1.5 px-2"
                    onClick={() => setShowAuthModal(true)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Account Settings
                  </Button>
                  
                  {/* Follow Path Dropdown */}
                  {followPaths.length > 0 && (
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 py-1.5 px-2"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowFollowPathDropdown(!showFollowPathDropdown);
                        }}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        {loadingPaths ? "Loading..." : followPathOptions.find(p => p.id === selectedFollowPath)?.name ?? "Follow Path"}
                        <ChevronDown className="h-4 w-4 ml-auto" />
                      </Button>
                      
                      {showFollowPathDropdown && (
                        <div className="absolute left-0 top-full mt-1 w-full bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-[1106]">
                          {/* Direct jumps using same waypoint dispatcher */}
                          <button
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-md"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowFollowPathDropdown(false); dispatchGoToWaypoint(WAYPOINTS.kitchen); }}
                          >
                            {t('kitchen')}
                          </button>
                          <button
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowFollowPathDropdown(false); dispatchGoToWaypoint(WAYPOINTS.bath); }}
                          >
                            {t('bathroom')}
                          </button>
                          <button
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 last:rounded-b-md"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowFollowPathDropdown(false); dispatchGoToWaypoint(WAYPOINTS.living); }}
                          >
                            {t('livingRoom')}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 py-1.5 px-2"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Authentication Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-lg z-[9999] flex items-start justify-center pt-[160px] px-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl max-h-[calc(100vh-180px)] overflow-y-auto">
            <Card className="border-0 bg-transparent">
            <CardHeader>
              <CardTitle className="text-center">
                {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
              </CardTitle>
              <CardDescription className="text-center">
                {authMode === 'signin' 
                  ? 'Sign in to access your scene configurations'
                  : 'Create a new account to get started'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAuth} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="Enter your email"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password
                  </label>
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="Enter your password"
                    required
                    minLength={6}
                  />
                </div>

                {authError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                    <p className="text-sm text-red-600 dark:text-red-400">{authError}</p>
                  </div>
                )}

                {authInfo && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                    <p className="text-sm text-blue-700 dark:text-blue-300">{authInfo}</p>
                  </div>
                )}

                <div className="flex space-x-2">
                  <Button 
                    type="submit" 
                    className="flex-1" 
                    disabled={authLoading}
                  >
                    {authLoading ? 'Loading...' : (authMode === 'signin' ? 'Sign In' : 'Sign Up')}
                  </Button>
                  
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => setShowAuthModal(false)}
                    className="px-4"
                  >
                    Cancel
                  </Button>
                </div>
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === 'signin' ? 'signup' : 'signin')
                    setAuthError('')
                  }}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                >
                  {authMode === 'signin' 
                    ? "Don't have an account? Sign up" 
                    : "Already have an account? Sign in"
                  }
                </button>
              </div>
            </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  )
}
