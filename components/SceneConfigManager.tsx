'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Plus, Save, Trash2, Settings } from 'lucide-react'
import { SceneConfigService } from '@/lib/services/SceneConfigService'
import { UserSceneConfig } from '@/lib/supabase'

interface SceneConfigManagerProps {
  user: any
}

export function SceneConfigManager({ user }: SceneConfigManagerProps) {
  const [configs, setConfigs] = useState<UserSceneConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [newConfigName, setNewConfigName] = useState('')
  const [showNewConfigForm, setShowNewConfigForm] = useState(false)

  const sceneConfigService = SceneConfigService.getInstance()

  useEffect(() => {
    if (user) {
      loadConfigs()
    }
  }, [user])

  const loadConfigs = async () => {
    try {
      setLoading(true)
      sceneConfigService.setUser(user)
      const userConfigs = await sceneConfigService.getUserConfigs()
      setConfigs(userConfigs)
    } catch (error) {
      console.error('Failed to load configs:', error)
      setMessage('Failed to load configurations')
    } finally {
      setLoading(false)
    }
  }

  const createNewConfig = async () => {
    if (!newConfigName.trim()) {
      setMessage('Please enter a configuration name')
      return
    }

    try {
      setSaving(true)
      setMessage('')
      
      // Create a new config based on the default settings
      const newConfig = await sceneConfigService.createConfig({
        config_name: newConfigName,
        model_path: '/models/no-material.glb',
        camera_fov: 75,
        camera_near: 0.1,
        camera_far: 1000,
        orbital_height: 40,
        orbital_radius_multiplier: 6,
        orbital_speed: 0.2,
        target_size: 30,
        scale_multiplier: 2,
        rotation_y: Math.PI / 2,
        intro_duration: 3000,
        intro_start_pos: { x: 0, y: 20, z: 0 },
        intro_end_pos: { x: -6.554798188035982, y: 7.001298362376955, z: 26.293127720925533 },
        hotspot_colors: { normal: 9223167, hover: 11722918, pulse: 9223167 },
        pulse_animation: { duration: 800, scale: 1.5, opacity: 0.8 },
        hotspot_focal_distances: {},
        hotspot_categories: {},
        camera_points: [],
        look_at_targets: [],
        api_hotspot_key_aliases: {},
        is_default: false
      }, newConfigName)

      setConfigs(prev => [newConfig, ...prev])
      setNewConfigName('')
      setShowNewConfigForm(false)
      setMessage('Configuration created successfully!')
    } catch (error: any) {
      console.error('Failed to create config:', error)
      setMessage(error.message || 'Failed to create configuration')
    } finally {
      setSaving(false)
    }
  }

  const deleteConfig = async (id: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) {
      return
    }

    try {
      setSaving(true)
      await sceneConfigService.deleteConfig(id)
      setConfigs(prev => prev.filter(config => config.id !== id))
      setMessage('Configuration deleted successfully!')
    } catch (error: any) {
      console.error('Failed to delete config:', error)
      setMessage(error.message || 'Failed to delete configuration')
    } finally {
      setSaving(false)
    }
  }

  const setAsDefault = async (id: string) => {
    try {
      setSaving(true)
      
      // First, unset all other default configs
      const defaultConfigs = configs.filter(config => config.is_default)
      for (const config of defaultConfigs) {
        await sceneConfigService.updateConfig(config.id, { is_default: false })
      }
      
      // Set the selected config as default
      await sceneConfigService.updateConfig(id, { is_default: true })
      
      // Update local state
      setConfigs(prev => prev.map(config => ({
        ...config,
        is_default: config.id === id
      })))
      
      setMessage('Default configuration updated!')
    } catch (error: any) {
      console.error('Failed to set default config:', error)
      setMessage(error.message || 'Failed to update default configuration')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading configurations...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Scene Configurations
        </CardTitle>
        <CardDescription>
          Manage your 3D scene configurations. Each user can have multiple configurations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <Alert>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Your Configurations</h3>
          <Button
            onClick={() => setShowNewConfigForm(!showNewConfigForm)}
            disabled={saving}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Configuration
          </Button>
        </div>

        {showNewConfigForm && (
          <Card>
            <CardHeader>
              <CardTitle>Create New Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="configName">Configuration Name</Label>
                <Input
                  id="configName"
                  value={newConfigName}
                  onChange={(e) => setNewConfigName(e.target.value)}
                  placeholder="Enter configuration name"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={createNewConfig} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  Create
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNewConfigForm(false)
                    setNewConfigName('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {configs.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No configurations found. Create your first configuration above.
            </p>
          ) : (
            configs.map((config) => (
              <Card key={config.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <h4 className="font-medium">{config.config_name}</h4>
                      <p className="text-sm text-gray-500">
                        Created: {new Date(config.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {config.is_default && (
                      <Badge variant="default">Default</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!config.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAsDefault(config.id)}
                        disabled={saving}
                      >
                        Set as Default
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteConfig(config.id)}
                      disabled={saving}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
