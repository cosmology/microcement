import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import * as THREE from 'three'
import gsap from 'gsap'
import { SCENE_CONFIG } from '@/lib/config/sceneConfig'

// Camera type enum
export type CameraType = 'orbital' | 'path'

interface CameraPoint {
  x: number
  y: number
  z: number
}

interface CameraState {
  // Three.js refs (stored in Zustand instead of window globals)
  cameraRef: THREE.PerspectiveCamera | null
  rendererRef: THREE.WebGLRenderer | null
  sceneRef: THREE.Scene | null
  
  // Camera type (UI state only for now)
  cameraType: CameraType
  orbitalHeight: number  // Height for orbital camera (0-100)
  
  // Bird view state
  isBirdView: boolean
  isBirdViewLocked: boolean
  wasBirdViewActiveBeforeScroll: boolean
  
  // Editor state
  isEditorEnabled: boolean
  showLookAtTargets: boolean
  showHeightPanel: boolean
  selectedPointIndex: number | null
  selectedLookAtIndex: number | null
  selectedHeightIndex: number | null
  
  // Camera path data
  cameraPoints: CameraPoint[]
  lookAtTargets: CameraPoint[]
  activePathId: string | null
  
  // Camera position (current)
  currentPosition: CameraPoint
  currentLookAt: CameraPoint
  currentFOV: number
  
  // Actions - Three.js Refs
  setCameraRef: (camera: THREE.PerspectiveCamera | null) => void
  setRendererRef: (renderer: THREE.WebGLRenderer | null) => void
  setSceneRef: (scene: THREE.Scene | null) => void
  
  // Actions - Camera Type
  setCameraType: (type: CameraType) => void
  toggleCameraType: () => void
  setOrbitalHeight: (height: number) => void
  
  // Actions - Bird View
  setIsBirdView: (value: boolean) => void
  toggleBirdView: () => void
  setIsBirdViewLocked: (value: boolean) => void
  toggleBirdViewLock: () => void
  setWasBirdViewActiveBeforeScroll: (value: boolean) => void
  
  // Actions - Editor
  setIsEditorEnabled: (value: boolean) => void
  toggleEditor: () => void
  setShowLookAtTargets: (value: boolean) => void
  toggleLookAtTargets: () => void
  setShowHeightPanel: (value: boolean) => void
  toggleHeightPanel: () => void
  
  // Actions - Selection
  setSelectedPointIndex: (index: number | null) => void
  setSelectedLookAtIndex: (index: number | null) => void
  setSelectedHeightIndex: (index: number | null) => void
  
  // Actions - Camera Path Data
  setCameraPoints: (points: CameraPoint[]) => void
  updateCameraPoint: (index: number, point: CameraPoint) => void
  setLookAtTargets: (targets: CameraPoint[]) => void
  updateLookAtTarget: (index: number, target: CameraPoint) => void
  setActivePathId: (id: string | null) => void
  
  // Actions - Camera Position
  setCurrentPosition: (position: CameraPoint) => void
  setCurrentLookAt: (lookAt: CameraPoint) => void
  setCurrentFOV: (fov: number) => void
  
  // Complex actions
  animateToBirdView: () => void
  animateToCameraView: () => void
  
  // Model utilities (triggers for SceneEditor to handle)
  clearSceneRequested: boolean
  rotateModelRequested: boolean
  rotationAngle: number
  requestClearScene: () => void
  requestRotateModel: (angle?: number) => void
  clearClearSceneRequest: () => void
  clearRotateModelRequest: () => void
  
  // Path visuals in 3D scene
  showPathVisuals: boolean
  togglePathVisuals: () => void
  
  // Reset
  reset: () => void
}

const initialState = {
  cameraRef: null,
  rendererRef: null,
  sceneRef: null,
  cameraType: 'orbital' as CameraType,  // UI state (doesn't control animation yet)
  orbitalHeight: 25,  // Default orbital height
  isBirdView: false,
  isBirdViewLocked: false,
  wasBirdViewActiveBeforeScroll: false,
  isEditorEnabled: false,
  showLookAtTargets: false,
  showHeightPanel: false,
  selectedPointIndex: null,
  selectedLookAtIndex: null,
  selectedHeightIndex: null,
  cameraPoints: [],
  lookAtTargets: [],
  activePathId: null,
  currentPosition: { x: 0, y: 0, z: 0 },
  currentLookAt: { x: 0, y: 0, z: 0 },
  currentFOV: 0,
  clearSceneRequested: false,
  rotateModelRequested: false,
  rotationAngle: Math.PI / 2,
  showPathVisuals: false, // Hidden by default
}

export const useCameraStore = create<CameraState>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      // Three.js Refs actions
      setCameraRef: (camera) => {
        set({ cameraRef: camera })
      },
      
      setRendererRef: (renderer) => {
        set({ rendererRef: renderer })
      },
      
      setSceneRef: (scene) => {
        set({ sceneRef: scene })
      },
      
      // Camera Type actions (UI only)
      setCameraType: (type) => {
        set({ cameraType: type })
        console.log(`📹 Camera Type UI: ${type}`)
      },
      
      toggleCameraType: () => {
        const current = get().cameraType
        const newType: CameraType = current === 'orbital' ? 'path' : 'orbital'
        set({ cameraType: newType })
        console.log(`📹 Camera Type Toggle: ${current} → ${newType}`)
      },
      
      setOrbitalHeight: (height) => {
        set({ orbitalHeight: height })
      },
      
      // Bird View actions
      setIsBirdView: (value) => set({ isBirdView: value }),
      
      toggleBirdView: () => {
        const newValue = !get().isBirdView
        set({ isBirdView: newValue })
      },
      
      setIsBirdViewLocked: (value) => set({ isBirdViewLocked: value }),
      
      toggleBirdViewLock: () => {
        const newValue = !get().isBirdViewLocked
        set({ isBirdViewLocked: newValue })
      },
      
      setWasBirdViewActiveBeforeScroll: (value) => set({ wasBirdViewActiveBeforeScroll: value }),
      
      // Editor actions
      setIsEditorEnabled: (value) => {
        // If disabling editor, also hide sub-features
        if (!value) {
          set({
            isEditorEnabled: value,
            showLookAtTargets: false,
            showHeightPanel: false,
            selectedPointIndex: null,
            selectedLookAtIndex: null,
            selectedHeightIndex: null
          })
        } else {
          set({ isEditorEnabled: value })
        }
      },
      
      toggleEditor: () => {
        const newValue = !get().isEditorEnabled
        get().setIsEditorEnabled(newValue)
      },
      
      setShowLookAtTargets: (value) => set({ showLookAtTargets: value }),
      
      toggleLookAtTargets: () => {
        const newValue = !get().showLookAtTargets
        set({ showLookAtTargets: newValue })
      },
      
      setShowHeightPanel: (value) => set({ showHeightPanel: value }),
      
      toggleHeightPanel: () => {
        const current = get().selectedHeightIndex
        set({ selectedHeightIndex: current !== null ? null : 0 })
      },
      
      // Selection actions
      setSelectedPointIndex: (index) => set({ selectedPointIndex: index }),
      setSelectedLookAtIndex: (index) => set({ selectedLookAtIndex: index }),
      setSelectedHeightIndex: (index) => set({ selectedHeightIndex: index }),
      
      // Camera path data actions
      setCameraPoints: (points) => set({ cameraPoints: points }),
      
      updateCameraPoint: (index, point) => {
        const points = [...get().cameraPoints]
        points[index] = point
        set({ cameraPoints: points })
      },
      
      setLookAtTargets: (targets) => set({ lookAtTargets: targets }),
      
      updateLookAtTarget: (index, target) => {
        const targets = [...get().lookAtTargets]
        targets[index] = target
        set({ lookAtTargets: targets })
      },
      
      setActivePathId: (id) => set({ activePathId: id }),
      
      // Camera position actions
      setCurrentPosition: (position) => set({ currentPosition: position }),
      setCurrentLookAt: (lookAt) => set({ currentLookAt: lookAt }),
      setCurrentFOV: (fov) => set({ currentFOV: fov }),
      
      // Complex actions
      animateToBirdView: () => set({ isBirdView: true }),
      animateToCameraView: () => set({ isBirdView: false }),
      
      // Model utilities
      requestClearScene: () => set({ clearSceneRequested: true }),
      requestRotateModel: (angle = Math.PI / 2) => set({ rotateModelRequested: true, rotationAngle: angle }),
      clearClearSceneRequest: () => set({ clearSceneRequested: false }),
      clearRotateModelRequest: () => set({ rotateModelRequested: false }),
      
      // Path visuals toggle
      togglePathVisuals: () => set((state) => ({ showPathVisuals: !state.showPathVisuals })),
      
      // Reset
      reset: () => set(initialState),
    }),
    { name: 'CameraStore' }
  )
)

