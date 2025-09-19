'use client'

import { useState, useEffect } from 'react'
import { Auth } from '@/components/Auth'
import { SceneConfigManager } from '@/components/SceneConfigManager'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LogOut, User, Settings } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function TestPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
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

        {!user ? (
          <div className="max-w-md mx-auto">
            <Auth onAuthChange={setUser} />
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
            <SceneConfigManager user={user} />

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
