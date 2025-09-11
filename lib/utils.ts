import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Mobile detection utilities using industry standards
export const isMobile = {
  // Check if device is mobile based on screen width
  byScreen: () => typeof window !== 'undefined' && window.innerWidth < 768,
  
  // Check if device is mobile based on user agent
  byUserAgent: () => {
    if (typeof navigator === 'undefined') return false
    const userAgent = navigator.userAgent.toLowerCase()
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
  },
  
  // Check if device is mobile based on touch capability
  byTouch: () => {
    if (typeof window === 'undefined') return false
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  },
  
  // Comprehensive mobile detection (combines all methods)
  detect: () => {
    if (typeof window === 'undefined') return false
    return isMobile.byScreen() || isMobile.byUserAgent() || isMobile.byTouch()
  },
  
  // Check if device is specifically a mobile phone (not tablet)
  isPhone: () => {
    if (typeof window === 'undefined') return false
    const userAgent = navigator.userAgent.toLowerCase()
    const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent)
    return isMobile.detect() && !isTablet
  },
  
  // Check if device is a tablet
  isTablet: () => {
    if (typeof window === 'undefined') return false
    const userAgent = navigator.userAgent.toLowerCase()
    return /ipad|android(?!.*mobile)/i.test(userAgent)
  }
}

// Hook for responsive breakpoints
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
}

// Get current breakpoint
export const getCurrentBreakpoint = () => {
  if (typeof window === 'undefined') return 'lg'
  
  const width = window.innerWidth
  if (width < breakpoints.sm) return 'xs'
  if (width < breakpoints.md) return 'sm'
  if (width < breakpoints.lg) return 'md'
  if (width < breakpoints.xl) return 'lg'
  if (width < breakpoints['2xl']) return 'xl'
  return '2xl'
}

// Orientation detection utilities
export const orientation = {
  // Check if device is in portrait orientation
  isPortrait: () => {
    if (typeof window === 'undefined') return true
    return window.innerHeight > window.innerWidth
  },
  
  // Check if device is in landscape orientation
  isLandscape: () => {
    if (typeof window === 'undefined') return false
    return window.innerWidth > window.innerHeight
  },
  
  // Get current orientation as string
  get: () => {
    if (typeof window === 'undefined') return 'portrait'
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
  },
  
  // Check if orientation matches media query
  matches: (query: 'portrait' | 'landscape') => {
    if (typeof window === 'undefined') return query === 'portrait'
    return orientation.get() === query
  }
}

// Convert CSS color string to Three.js hex value
export const cssColorToHex = (cssColor: string): number => {
  // Create a temporary canvas to get computed color
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return 0x000000
  
  // Set the color and get RGB values
  ctx.fillStyle = cssColor
  ctx.fillRect(0, 0, 1, 1)
  const imageData = ctx.getImageData(0, 0, 1, 1)
  const [r, g, b] = imageData.data
  
  // Convert RGB to hex
  const hex = (r << 16) | (g << 8) | b
  
  
  return hex
}

// Theme color utilities
export const getThemeColors = () => {
  if (typeof window === 'undefined') {
    return {
      gradient: `
        linear-gradient(
          to bottom,
          hsl(var(--background) / 0.9) 0%,
          hsl(var(--background) / 0.5) 70%,
          hsl(var(--background) / 0) 100%
        )
      `,
      baseBackground: isDark ? '#02030A' : '#f5f3ed'
    }
  }

  const isDark = document.documentElement.classList.contains('dark')
  
  
  return {
    gradient: `
      linear-gradient(
        to bottom,
        hsl(var(--background) / 0.9) 0%,
        hsl(var(--background) / 0.5) 70%,
        hsl(var(--background) / 0) 100%
      )
    `,
    baseBackground: isDark ? '#02030A' : '#f5f3ed',
    isDark,
    background: isDark ? '#02030A' : '#f5f3ed', // Different colors for light/dark
    foreground: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
    muted: isDark ? 'hsl(var(--muted))' : 'hsl(var(--muted))',
    mutedForeground: isDark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground))'
  }
}
