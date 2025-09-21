'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LogOut, User, Settings, Mail, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import SceneConfigManager from '@/app/components/SceneConfigManager'

export default function TestPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    setMounted(true)
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
      } catch (error) {
        console.error('Auth check failed:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')

    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        // Success message will be handled by auth state change
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      }
    } catch (error: any) {
      setAuthError(error.message)
    } finally {
      setAuthLoading(false)
    }
  }

  // Don't render anything until mounted to prevent hydration issues
  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Microcement 3D Configurator
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Test Supabase Authentication & Scene Configuration Management
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading...</p>
            </div>
          </div>
        ) : !user ? (
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">
                  {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
                </CardTitle>
                <CardDescription className="text-center">
                  {authMode === 'signin' 
                    ? 'Sign in to access scene configuration management'
                    : 'Create a new account to get started'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAuth} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your password"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  {authError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-600">{authError}</p>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={authLoading}
                  >
                    {authLoading ? 'Loading...' : (authMode === 'signin' ? 'Sign In' : 'Sign Up')}
                  </Button>
                </form>

                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode(authMode === 'signin' ? 'signup' : 'signin')
                      setAuthError('')
                    }}
                    className="text-sm text-blue-600 hover:text-blue-500"
                  >
                    {authMode === 'signin' 
                      ? "Don't have an account? Sign up" 
                      : "Already have an account? Sign in"
                    }
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Test Instructions */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Test Instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">How to test:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    <li>Sign up with a new email address</li>
                    <li>Check your email for confirmation (if required)</li>
                    <li>Sign in with your credentials</li>
                    <li>Test scene configuration management</li>
                    <li>Sign out and sign back in to verify persistence</li>
                  </ul>
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">Supabase Auth</Badge>
                  <Badge variant="outline">PostgreSQL</Badge>
                  <Badge variant="outline">Row Level Security</Badge>
                  <Badge variant="outline">Next.js API Routes</Badge>
                  <Badge variant="outline">TypeScript</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* User Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Welcome, {user.email}!
                </CardTitle>
                <CardDescription>
                  You are successfully authenticated and can now manage your scene configurations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">User ID: {user.id}</p>
                    <p className="text-sm text-gray-500">
                      Last sign in: {new Date(user.last_sign_in_at).toLocaleString()}
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Scene Config Manager */}
            <SceneConfigManager userId={user.id} />

            {/* Test Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Test Instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">What you can test:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    <li>Create new scene configurations with custom names</li>
                    <li>Set any configuration as your default</li>
                    <li>Delete configurations you no longer need</li>
                    <li>Each user has their own isolated configurations</li>
                    <li>Configurations persist between sessions</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Database Features:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    <li>Row Level Security (RLS) ensures users only see their own data</li>
                    <li>Automatic timestamps for created_at and updated_at</li>
                    <li>JSONB fields for flexible scene configuration storage</li>
                    <li>Foreign key constraints with cascade delete</li>
                  </ul>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">Supabase Auth</Badge>
                  <Badge variant="outline">PostgreSQL</Badge>
                  <Badge variant="outline">Row Level Security</Badge>
                  <Badge variant="outline">Next.js API Routes</Badge>
                  <Badge variant="outline">TypeScript</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}