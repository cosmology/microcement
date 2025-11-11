import { SceneConfigService } from '@/lib/services/SceneConfigService'
import { AuthService } from '@/lib/services/AuthService'

export class DebouncedUpdater {
  private timeoutId: NodeJS.Timeout | null = null
  private delay: number

  constructor(delay: number = 500) {
    this.delay = delay
  }

  update(callback: () => void) {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
    }
    
    this.timeoutId = setTimeout(() => {
      callback()
      this.timeoutId = null
    }, this.delay)
  }

  cancel() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
  }
}

// Remove the old instance - we'll create a new one below

// Mock user and scene config IDs for development
export const getCurrentUserId = (): string | null => {
  // Prefer window-provided id set by app after auth
  if (typeof window !== 'undefined' && (window as any).__currentUserId) {
    return (window as any).__currentUserId as string
  }
  return null
}

export const getCurrentSceneConfigId = (): string | null => {
  if (typeof window !== 'undefined' && (window as any).__currentSceneConfigId) {
    return (window as any).__currentSceneConfigId as string
  }
  return null
}

// Extend the DebouncedUpdater class to include camera point methods
export class CameraPointUpdater extends DebouncedUpdater {
  async getCurrentUserId(): Promise<string | null> {
    const identity = await AuthService.getClientIdentity()
    const userId = identity?.userId ?? null

    if (typeof window !== 'undefined') {
      ;(window as any).__currentUserId = userId
    }

    return userId
  }

  async getCurrentSceneConfigId(): Promise<string | null> {
    try {
      const userId = await this.getCurrentUserId()
      if (!userId) return null
      
      const svc = SceneConfigService.getInstance()
      svc.setUser({ id: userId })
      const cfg = await svc.getDefaultConfig()
      const sceneConfigId = cfg?.id ?? null
      if (typeof window !== 'undefined') {
        ;(window as any).__currentSceneConfigId = sceneConfigId
      }
      return sceneConfigId
    } catch {
      return null
    }
  }

  updatePoints(points: Array<{ x: number; y: number; z: number }>, targets: Array<{ x: number; y: number; z: number }>) {
    // Store the latest points for the debounced save
    this.latestPoints = points
    this.latestTargets = targets
    
    console.log('🔥 [DebouncedUpdater] updatePoints called with', points.length, 'points')
    
    // Use inherited debouncing mechanism
    this.update(() => {
      console.log('🔥 [DebouncedUpdater] Debounced callback triggered, calling savePoints')
      this.savePoints()
    })
  }
  
  private latestPoints: Array<{ x: number; y: number; z: number }> = []
  private latestTargets: Array<{ x: number; y: number; z: number }> = []
  
  private async savePoints() {
    console.log('🔥 [DebouncedUpdater] savePoints() method called')
    
    // Always get fresh user ID and scene config ID from Supabase
    const userId = await this.getCurrentUserId()
    const sceneConfigId = await this.getCurrentSceneConfigId()
    
    console.log('🔍 [DebouncedUpdater] Fresh user ID from Supabase:', userId)
    console.log('🔍 [DebouncedUpdater] Fresh scene config ID:', sceneConfigId)
    
    if (this.latestPoints.length === 0) {
      console.log('⚠️ [DebouncedUpdater] No points to save')
      return
    }
    if (!userId || !sceneConfigId) {
      console.warn('⚠️ [DebouncedUpdater] Missing identifiers for save', { userId, sceneConfigId })
      return
    }
    
    try {
      console.log('🔥 [DebouncedUpdater] Debounced save triggered for', this.latestPoints.length, 'points')
      console.log('🔥 [DebouncedUpdater] About to call savePoints() method')
      
      const response = await fetch('/api/camera-path', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          sceneDesignConfigId: sceneConfigId,
          cameraPoints: this.latestPoints,
          lookAtTargets: this.latestTargets
        })
      })
      
      if (response.ok) {
        console.log('✅ [DebouncedUpdater] Successfully saved camera points to database')
      } else {
        const errorData = await response.text()
        console.error('❌ [DebouncedUpdater] Failed to save to database:', response.status, errorData)
      }
    } catch (error) {
      console.error('❌ [DebouncedUpdater] Error saving to database:', error)
    }
  }
}

// Create the camera point updater instance
export const cameraPointUpdater = new CameraPointUpdater(300)
