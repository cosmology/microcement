import { create } from 'zustand'

interface ThemeState {
  // Theme state (synced with next-themes)
  theme: 'light' | 'dark' | 'system'
  resolvedTheme: 'light' | 'dark'
  
  // Gallery modal state
  isGalleryOpen: boolean
  galleryImages: any[]
  
  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setResolvedTheme: (theme: 'light' | 'dark') => void
  toggleTheme: () => void
  openGallery: (images: any[]) => void
  closeGallery: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  // Initial state
  theme: 'system',
  resolvedTheme: 'dark',
  isGalleryOpen: false,
  galleryImages: [],
  
  // Actions
  setTheme: (theme) => set({ theme }),
  
  setResolvedTheme: (resolvedTheme) => set({ resolvedTheme }),
  
  toggleTheme: () => {
    const { resolvedTheme } = get()
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
    set({ theme: newTheme, resolvedTheme: newTheme })
    
    // Also update next-themes (will be called from component)
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(newTheme)
    }
  },
  
  openGallery: (images) => set({ isGalleryOpen: true, galleryImages: images }),
  
  closeGallery: () => set({ isGalleryOpen: false, galleryImages: [] }),
}))

