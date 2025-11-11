import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface DockedNavigationState {
  // Panel visibility
  isCollapsed: boolean
  showModelsList: boolean
  showUploadModal: boolean
  showUploads: boolean
  showCameraControls: boolean
  showScanner: boolean
  showScannedRooms: boolean
  
  // Selected items
  selectedModelId: string | null
  selectedUploadId: string | null
  
  // Filter states
  modelsStatusFilter: string
  
  // Actions
  setIsCollapsed: (collapsed: boolean) => void
  setShowModelsList: (show: boolean) => void
  setShowUploadModal: (show: boolean) => void
  setShowUploads: (show: boolean) => void
  setShowCameraControls: (show: boolean) => void
  setShowScanner: (show: boolean) => void
  setShowScannedRooms: (show: boolean) => void
  setSelectedModelId: (id: string | null) => void
  setSelectedUploadId: (id: string | null) => void
  setModelsStatusFilter: (filter: string) => void
  
  // Complex actions
  openModelsList: () => void
  openUploads: () => void
  openUploadModal: () => void
  openCameraControls: () => void
  openScanner: () => void
  openScannedRooms: () => void
  closeAllPanels: () => void
  
  // Reset
  reset: () => void
}

const initialState = {
  isCollapsed: true,
  showModelsList: false,
  showUploadModal: false,
  showUploads: false,
  showCameraControls: false,
  showScanner: false,
  showScannedRooms: false,
  selectedModelId: null,
  selectedUploadId: null,
  modelsStatusFilter: 'all',
}

export const useDockedNavigationStore = create<DockedNavigationState>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      // Simple setters
      setIsCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
      setShowModelsList: (show) => set({ showModelsList: show }),
      setShowUploadModal: (show) => set({ showUploadModal: show }),
      setShowUploads: (show) => set({ showUploads: show }),
      setShowCameraControls: (show) => set({ showCameraControls: show }),
      setShowScanner: (show) => set({ showScanner: show }),
      setShowScannedRooms: (show) => set({ showScannedRooms: show }),
      setSelectedModelId: (id) => set({ selectedModelId: id }),
      setSelectedUploadId: (id) => set({ selectedUploadId: id }),
      setModelsStatusFilter: (filter) => set({ modelsStatusFilter: filter }),
      
      // Complex actions
      openModelsList: () => set({
        showModelsList: true,
        showUploads: false,
        showCameraControls: false,
        showUploadModal: false,
        showScanner: false,
        showScannedRooms: false,
      }),
      
      openUploads: () => set({
        showModelsList: false,
        showUploads: true,
        showCameraControls: false,
        showUploadModal: false,
        showScanner: false,
        showScannedRooms: false,
      }),
      
      openCameraControls: () => set({
        showModelsList: false,
        showUploads: false,
        showCameraControls: true,
        showUploadModal: false,
        showScanner: false,
        showScannedRooms: false,
      }),
      
      openUploadModal: () => set({
        showUploadModal: true,
        isCollapsed: true,
      }),
      
      openScanner: () => set({
        showModelsList: false,
        showUploads: false,
        showCameraControls: false,
        showUploadModal: false,
        showScanner: true,
        showScannedRooms: false,
      }),
      
      openScannedRooms: () => set({
        showModelsList: false,
        showUploads: false,
        showCameraControls: false,
        showUploadModal: false,
        showScanner: false,
        showScannedRooms: true,
      }),
      
      closeAllPanels: () => set({
        showModelsList: false,
        showUploads: false,
        showCameraControls: false,
        showUploadModal: false,
        showScanner: false,
        showScannedRooms: false,
      }),
      
      // Reset
      reset: () => set(initialState),
    }),
    { name: 'DockedNavigationStore' }
  )
)

