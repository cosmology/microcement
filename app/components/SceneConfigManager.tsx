'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Settings, Plus, Trash2, Star, StarOff } from 'lucide-react'
import { SceneConfigService } from '@/lib/services/SceneConfigService'

interface SceneConfigManagerProps {
  userId: string
}

export default function SceneConfigManager({ userId }: SceneConfigManagerProps) {
  const [configs, setConfigs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadConfigs()
  }, [userId])

  const loadConfigs = async () => {
    try {
      setLoading(true)
      const sceneConfigService = SceneConfigService.getInstance()
      sceneConfigService.setUser({ id: userId })
      
      const userConfigs = await sceneConfigService.getUserConfigs()
      setConfigs(userConfigs)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createNewConfig = async () => {
    try {
      const sceneConfigService = SceneConfigService.getInstance()
      sceneConfigService.setUser({ id: userId })
      
      const newConfig = await sceneConfigService.createConfig({
        is_default: false,
        camera_points: [
          { x: 20, y: 5, z: 0 },
          { x: -8, y: 6.5, z: 2 },
          { x: -14, y: 6.75, z: 7 },
        ],
        look_at_targets: [
          { x: 0, y: 0, z: 0 },
          { x: 4, y: 3, z: 0 },
          { x: 6, y: 4, z: 0 },
        ],
        hotspot_colors: {
          normal: 0xb2d926,
          hover: 0xc4e53a,
          pulse: 0xa0c91a
        },
        pulse_animation: {
          duration: 2000,
          scale: 1.2,
          opacity: 0.8
        },
        hotspot_focal_distances: {},
        hotspot_categories: {}
      })
      
      setConfigs([...configs, newConfig])
    } catch (err: any) {
      setError(err.message)
    }
  }

  const setAsDefault = async (configId: string) => {
    try {
      const sceneConfigService = SceneConfigService.getInstance()
      sceneConfigService.setUser({ id: userId })
      
      await sceneConfigService.setDefaultConfig(configId)
      await loadConfigs() // Reload to update the UI
    } catch (err: any) {
      setError(err.message)
    }
  }

  const deleteConfig = async (configId: string) => {
    try {
      const sceneConfigService = SceneConfigService.getInstance()
      sceneConfigService.setUser({ id: userId })
      
      await sceneConfigService.deleteConfig(configId)
      setConfigs(configs.filter(config => config.id !== configId))
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
            <span className="ml-2">Loading configurations...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Scene Configuration Manager
        </CardTitle>
        <CardDescription>
          Manage your personal 3D scene configurations. Each user has their own isolated settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex justify-between items-center">
          <h3 className="font-medium">Your Configurations</h3>
          <Button onClick={createNewConfig} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Config
          </Button>
        </div>

        {configs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Settings className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No scene configurations found.</p>
            <p className="text-sm">Create your first configuration to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {configs.map((config) => (
              <div
                key={config.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {config.is_default ? (
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    ) : (
                      <StarOff className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="font-medium">{config.name}</span>
                    {config.is_default && (
                      <Badge variant="secondary" className="text-xs">Default</Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {!config.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAsDefault(config.id)}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteConfig(config.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 border-t border-gray-200">
          <h4 className="font-medium mb-2">Database Features:</h4>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">Row Level Security</Badge>
            <Badge variant="outline">User Isolation</Badge>
            <Badge variant="outline">JSONB Storage</Badge>
            <Badge variant="outline">Auto Timestamps</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
