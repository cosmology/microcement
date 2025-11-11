import { create } from 'zustand'

interface CameraPoint {
  x: number
  y: number
  z: number
}

interface CameraEditorState {
  // Bird view state
  isBirdView: boolean
  isBirdViewLocked: boolean
  
  // Editor state
  isEditorEnabled: boolean
  showLookAtTargets: boolean
  selectedHeightIndex: number | null
  
  // Camera path data
  cameraPoints: CameraPoint[]
  lookAtTargets: CameraPoint[]
  activePathId: string | null
  
  // Actions
  setIsBirdView: (value: boolean) => void
  setIsBirdViewLocked: (value: boolean) => void
  toggleBirdView: () => void
  toggleBirdViewLock: () => void
  
  setIsEditorEnabled: (value: boolean) => void
  toggleEditor: () => void
  
  setShowLookAtTargets: (value: boolean) => void
  toggleLookAtTargets: () => void
  
  setSelectedHeightIndex: (value: number | null) => void
  toggleHeightPanel: () => void
  
  setCameraPoints: (points: CameraPoint[]) => void
  setLookAtTargets: (targets: CameraPoint[]) => void
  setActivePathId: (id: string | null) => void
  
  // Reset all state
  reset: () => void
}

const initialState = {
  isBirdView: false,
  isBirdViewLocked: false,
  isEditorEnabled: false,
  showLookAtTargets: false,
  selectedHeightIndex: null,
  cameraPoints: [],
  lookAtTargets: [],
  activePathId: null,
}

export const useCameraEditorStore = create<CameraEditorState>((set, get) => ({
  ...initialState,
  
  // Bird view actions
  setIsBirdView: (value) => set({ isBirdView: value }),
  setIsBirdViewLocked: (value) => set({ isBirdViewLocked: value }),
  toggleBirdView: () => set((state) => ({ isBirdView: !state.isBirdView })),
  toggleBirdViewLock: () => set((state) => ({ isBirdViewLocked: !state.isBirdViewLocked })),
  
  // Editor actions
  setIsEditorEnabled: (value) => set({ isEditorEnabled: value }),
  toggleEditor: () => set((state) => {
    const newState = !state.isEditorEnabled
    // If disabling editor, also hide sub-features
    if (!newState) {
      return {
        isEditorEnabled: newState,
        showLookAtTargets: false,
        selectedHeightIndex: null
      }
    }
    return { isEditorEnabled: newState }
  }),
  
  // LookAt targets actions
  setShowLookAtTargets: (value) => set({ showLookAtTargets: value }),
  toggleLookAtTargets: () => set((state) => ({ showLookAtTargets: !state.showLookAtTargets })),
  
  // Height panel actions
  setSelectedHeightIndex: (value) => set({ selectedHeightIndex: value }),
  toggleHeightPanel: () => set((state) => ({
    selectedHeightIndex: state.selectedHeightIndex !== null ? null : 0
  })),
  
  // Camera path data actions
  setCameraPoints: (points) => set({ cameraPoints: points }),
  setLookAtTargets: (targets) => set({ lookAtTargets: targets }),
  setActivePathId: (id) => set({ activePathId: id }),
  
  // Reset
  reset: () => set(initialState),
}))

