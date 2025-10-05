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
export const getCurrentUserId = (): string => {
  // In a real app, this would come from authentication
  return 'f1e2d3c4-b5a6-9780-1234-567890abcdef'
}

export const getCurrentSceneConfigId = (): string => {
  // In a real app, this would come from the current scene configuration
  return 'd4e5f6a7-b8c9-0123-4567-89abcdef0123'
}

// Extend the DebouncedUpdater class to include camera point methods
export class CameraPointUpdater extends DebouncedUpdater {
  getCurrentUserId(): string {
    return getCurrentUserId()
  }

  getCurrentSceneConfigId(): string {
    return getCurrentSceneConfigId()
  }

  updatePoints(points: Array<{ x: number; y: number; z: number }>, targets: Array<{ x: number; y: number; z: number }>) {
    // Store the latest points for the debounced save
    this.latestPoints = points
    this.latestTargets = targets
    
    // Use inherited debouncing mechanism
    this.update(() => {
      this.savePoints()
    })
  }
  
  private latestPoints: Array<{ x: number; y: number; z: number }> = []
  private latestTargets: Array<{ x: number; y: number; z: number }> = []
  
  private async savePoints() {
    const userId = this.getCurrentUserId()
    const sceneConfigId = this.getCurrentSceneConfigId()
    
    if (this.latestPoints.length === 0) {
      console.log('⚠️ [DebouncedUpdater] No points to save')
      return
    }
    
    try {
      console.log('🔥 [DebouncedUpdater] Debounced save triggered for', this.latestPoints.length, 'points')
      
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
