import * as THREE from 'three'

export interface CameraPoint {
  x: number
  y: number
  z: number
}

export interface SceneEditorProps {
  sceneStage?: number
  currentSection?: string
  onIntroComplete?: () => void
  onIntroStart?: () => void
  onDebugUpdate?: (data: any) => void
  user?: any
}

export interface ModelLoadResult {
  model: THREE.Group
  animations?: THREE.AnimationClip[]
}

export interface PathVisualsConfig {
  showCameraPath: boolean
  showWaypoints: boolean
  showLookupTargets: boolean
}

export interface IntroAnimation {
  isPlaying: boolean
  duration: number
  startPosition: CameraPoint
  endPosition: CameraPoint
  startLookAt: CameraPoint
  endLookAt: CameraPoint
}

