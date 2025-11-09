import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export type ProjectStatus = 
  | 'pending_upload'
  | 'pending_architect' 
  | 'in_progress'
  | 'pending_review'
  | 'active'
  | 'on_hold'
  | 'completed'
  | 'cancelled'

interface SceneConfig {
  id: string
  user_id: string
  config_name: string
  model_path: string
  project_name: string | null
  project_description: string | null
  project_status: ProjectStatus | null
  architect_id: string | null
  client_id: string | null
  is_default: boolean
  created_at: string | null
  updated_at: string | null
}

interface FollowPath {
  id: string
  scene_design_config_id: string
  path_name: string
  camera_points: Array<{ x: number; y: number; z: number }>
  look_at_targets: Array<{ x: number; y: number; z: number }>
  is_active: boolean
}

interface RoomPlanWall {
  dimensions: [number, number, number] // [width, height, depth] in meters
  transform: number[] // 4x4 matrix (16 elements)
  identifier: string
  surfaceArea?: number // calculated in m²
}

interface RoomPlanOpening {
  category: string // 'door' or 'window'
  transform: number[] // 4x4 matrix (16 elements)
  dimensions?: [number, number, number] // if available
  surfaceArea?: number // calculated in m²
}

interface RoomPlanObject {
  category: string
  transform: number[] // 4x4 matrix (16 elements)
  dimensions?: [number, number, number] // if available
  surfaceArea?: number // calculated in m²
}

interface RoomPlanMetadata {
  walls?: RoomPlanWall[]
  doors?: RoomPlanOpening[]
  windows?: RoomPlanOpening[]
  objects?: RoomPlanObject[]
  totalSurfaceArea?: number // total calculated surface area in m²
}

interface SceneState {
  // Current scene config
  currentConfig: SceneConfig | null
  currentFollowPath: FollowPath | null
  
  // Model state
  modelLoaded: boolean
  modelPath: string | null
  modelLoadingProgress: number
  
  // RoomPlan JSON metadata
  roomPlanJsonPath: string | null
  roomPlanMetadata: RoomPlanMetadata | null
  showMeasurements: boolean
  
  // Scene progress
  sceneStage: number
  currentSection: string
  scrollProgress: number
  
  // Intro animation
  introComplete: boolean
  introPlaying: boolean
  scrollEnabled: boolean
  
  // World rotation state
  worldRotation: {
    x: number
    y: number
    z: number
  }
  
  // Loading states
  configsLoading: boolean
  hasUserConfig: boolean | null
  configCheckComplete: boolean
  
  // Actions
  setCurrentConfig: (config: SceneConfig | null) => void
  setCurrentFollowPath: (path: FollowPath | null) => void
  setModelLoaded: (loaded: boolean) => void
  setModelPath: (path: string | null) => void
  setModelLoadingProgress: (progress: number) => void
  setRoomPlanJsonPath: (path: string | null) => void
  setRoomPlanMetadata: (metadata: RoomPlanMetadata | null) => void
  setShowMeasurements: (show: boolean) => void
  toggleMeasurements: () => void
  setSceneStage: (stage: number) => void
  setCurrentSection: (section: string) => void
  setScrollProgress: (progress: number) => void
  setIntroComplete: (complete: boolean) => void
  setIntroPlaying: (playing: boolean) => void
  setScrollEnabled: (enabled: boolean) => void
  setConfigsLoading: (loading: boolean) => void
  setHasUserConfig: (has: boolean | null) => void
  setConfigCheckComplete: (complete: boolean) => void
  
  // World rotation actions
  setWorldRotation: (rotation: { x: number; y: number; z: number }) => void
  updateWorldRotation: (axis: 'x' | 'y' | 'z', value: number) => void
  resetWorldRotation: () => void
  
  // Complex actions
  loadConfig: (configId: string) => Promise<void>
  clearScene: () => void
  reset: () => void
}

const initialState = {
  currentConfig: null,
  currentFollowPath: null,
  modelLoaded: false,
  modelPath: null,
  modelLoadingProgress: 0,
  roomPlanJsonPath: null,
  roomPlanMetadata: null,
  showMeasurements: false,
  sceneStage: 0,
  currentSection: 'hero',
  scrollProgress: 0,
  introComplete: false,
  introPlaying: false,
  scrollEnabled: true,
  worldRotation: {
    x: 0,
    y: 0,
    z: 0
  },
  configsLoading: false,
  hasUserConfig: null,
  configCheckComplete: false,
}

export const useSceneStore = create<SceneState>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      // Simple setters
      setCurrentConfig: (config) => set({ currentConfig: config }),
      setCurrentFollowPath: (path) => set({ currentFollowPath: path }),
      setModelLoaded: (loaded) => set({ modelLoaded: loaded }),
      setModelPath: (path) => set({ modelPath: path }),
      setModelLoadingProgress: (progress) => set({ modelLoadingProgress: progress }),
      setRoomPlanJsonPath: (path) => set({ roomPlanJsonPath: path }),
      setRoomPlanMetadata: (metadata) => set({ roomPlanMetadata: metadata }),
      setShowMeasurements: (show) => set({ showMeasurements: show }),
      toggleMeasurements: () => set((state) => ({ showMeasurements: !state.showMeasurements })),
      setSceneStage: (stage) => set({ sceneStage: stage }),
      setCurrentSection: (section) => set({ currentSection: section }),
      setScrollProgress: (progress) => set({ scrollProgress: progress }),
      setIntroComplete: (complete) => set({ introComplete: complete }),
      setIntroPlaying: (playing) => set({ introPlaying: playing }),
      setScrollEnabled: (enabled) => set({ scrollEnabled: enabled }),
      setConfigsLoading: (loading) => set({ configsLoading: loading }),
      setHasUserConfig: (has) => set({ hasUserConfig: has }),
      setConfigCheckComplete: (complete) => set({ configCheckComplete: complete }),
      
      // World rotation actions
      setWorldRotation: (rotation) => set({ worldRotation: rotation }),
      updateWorldRotation: (axis, value) => set((state) => ({
        worldRotation: {
          ...state.worldRotation,
          [axis]: value
        }
      })),
      resetWorldRotation: () => set({
        worldRotation: { x: 0, y: 0, z: 0 }
      }),
      
      // Complex actions
      loadConfig: async (configId) => {
        // This will be implemented to load scene config from database
        console.log('🔍 [SceneStore] Loading config:', configId)
      },
      
      clearScene: () => set({
        modelLoaded: false,
        modelPath: null,
        modelLoadingProgress: 0,
        roomPlanJsonPath: null,
        roomPlanMetadata: null,
        worldRotation: { x: 0, y: 0, z: 0 }
      }),
      
      reset: () => set(initialState),
    }),
    { name: 'SceneStore' }
  )
)

// Global access function for animation loop
export const getSceneStoreState = () => useSceneStore.getState();

