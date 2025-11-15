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

/**
 * Model transformation data (serializable for Zustand)
 * Stores only lightweight, serializable data - not Three.js objects
 * Vertex samples are kept in component refs for performance (not stored here)
 */
interface ModelTransformData {
  // Position (meters)
  position: { x: number; y: number; z: number }
  // Rotation (quaternion: [x, y, z, w])
  rotation: [number, number, number, number]
  // Scale (unitless multiplier)
  scale: { x: number; y: number; z: number }
  // Bounding box (meters)
  boundingBox: {
    min: { x: number; y: number; z: number }
    max: { x: number; y: number; z: number }
    center: { x: number; y: number; z: number }
    size: { x: number; y: number; z: number }
  }
  // Bounding sphere (meters)
  boundingSphere: {
    center: { x: number; y: number; z: number }
    radius: number
  }
}

/**
 * RoomPlan coordinate system analysis (serializable)
 */
interface RoomPlanSystemData {
  units: 'meters' | 'unknown'
  origin: { x: number; y: number; z: number } | null
  boundingBox: {
    min: { x: number; y: number; z: number }
    max: { x: number; y: number; z: number }
    center: { x: number; y: number; z: number }
    size: { x: number; y: number; z: number }
  } | null
  wallCount: number
  hasVertexData: boolean
  averageWallWidth: number // meters
  averageWallHeight: number // meters
  totalSurfaceArea: number | null // m²
}

/**
 * Precise scale factor calculation (for 1mm alignment)
 */
interface ScaleFactorData {
  scaleX: number // Scale factor for X axis (model / roomplan)
  scaleY: number // Scale factor for Y axis (model / roomplan)
  scaleZ: number // Scale factor for Z axis (model / roomplan)
  uniformHorizontalScale: number // Average of X and Z for walls
  verticalScale: number // Y scale for height
  centerOffset: { x: number; y: number; z: number } // Offset to align centers (meters)
  precision: number // Precision achieved (meters, target: 0.001m = 1mm)
  confidence: 'high' | 'medium' | 'low' // Confidence in alignment
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
  
  // Phase 1: Coordinate system data for precise measurement alignment (1mm precision)
  // Stored as serializable data (not Three.js objects) for performance and Zustand compatibility
  modelTransform: ModelTransformData | null
  roomPlanSystem: RoomPlanSystemData | null
  scaleFactor: ScaleFactorData | null
  
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
  
  // Calculator state (Phase 4: Performance optimization)
  // Material selection per wall: { [wallIdentifier]: 'paint' | 'tile' | 'microcement' }
  wallMaterials: Record<string, 'paint' | 'tile' | 'microcement'>
  
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
  
  // Coordinate system actions (Phase 1)
  setModelTransform: (transform: ModelTransformData | null) => void
  setRoomPlanSystem: (system: RoomPlanSystemData | null) => void
  setScaleFactor: (factor: ScaleFactorData | null) => void
  clearCoordinateData: () => void // Clear all coordinate system data
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
  
  // Calculator actions (Phase 4: Performance optimization)
  setWallMaterial: (wallId: string, material: 'paint' | 'tile' | 'microcement') => void
  resetCalculator: () => void // Reset when new model loads
  
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
  
  // Coordinate system data (Phase 1)
  modelTransform: null,
  roomPlanSystem: null,
  scaleFactor: null,
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
  wallMaterials: {}, // Calculator state: empty by default, populated when walls are loaded
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
      setShowMeasurements: (show) => {
        console.log('📐 [SceneStore] setShowMeasurements called:', show);
        set({ showMeasurements: show });
      },
      toggleMeasurements: () => {
        const currentState = get().showMeasurements;
        const newState = !currentState;
        console.log('📐 [SceneStore] toggleMeasurements called, current:', currentState, '-> new:', newState);
        set({ showMeasurements: newState });
        console.log('📐 [SceneStore] showMeasurements updated to:', get().showMeasurements);
      },
      
      // Coordinate system actions (Phase 1)
      setModelTransform: (transform) => {
        console.log('📊 [SceneStore] setModelTransform called');
        set({ modelTransform: transform });
      },
      setRoomPlanSystem: (system) => {
        console.log('📊 [SceneStore] setRoomPlanSystem called');
        set({ roomPlanSystem: system });
      },
      setScaleFactor: (factor) => {
        console.log('📊 [SceneStore] setScaleFactor called, precision:', factor ? `${(factor.precision * 1000).toFixed(3)}mm` : 'null');
        set({ scaleFactor: factor });
      },
      clearCoordinateData: () => {
        console.log('📊 [SceneStore] clearCoordinateData called');
        set({ 
          modelTransform: null, 
          roomPlanSystem: null, 
          scaleFactor: null 
        });
      },
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
      
      // Calculator actions (Phase 4: Performance optimization)
      setWallMaterial: (wallId, material) => set((state) => ({
        wallMaterials: {
          ...state.wallMaterials,
          [wallId]: material,
        },
      })),
      resetCalculator: () => set({ wallMaterials: {} }),
      
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
        worldRotation: { x: 0, y: 0, z: 0 },
        wallMaterials: {}, // Reset calculator when scene is cleared
        // Clear coordinate system data when scene is cleared
        modelTransform: null,
        roomPlanSystem: null,
        scaleFactor: null,
      }),
      
      reset: () => set(initialState),
    }),
    { name: 'SceneStore' }
  )
)

// Global access function for animation loop
export const getSceneStoreState = () => useSceneStore.getState();

