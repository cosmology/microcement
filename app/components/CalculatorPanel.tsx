'use client'

import React from 'react'
import { PanelLeftClose, GripVertical } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useSceneStore } from '@/lib/stores/sceneStore'
import { useDockedNavigationStore } from '@/lib/stores/dockedNavigationStore'
import { ScrollArea } from '@/components/ui/scroll-area'

// Material pricing constants (per square meter)
const MATERIAL_PRICES = {
  paint: 10,        // $10/m²
  tile: 30,         // $30/m²
  microcement: 100  // $100/m²
} as const

type MaterialType = keyof typeof MATERIAL_PRICES

interface WallWithMaterial {
  id: string
  name: string
  dimensions: {
    width: number  // meters
    height: number // meters
  }
  surfaceArea: number // m²
  material: MaterialType
  price: number // $XX.XX
}

const CalculatorPanel = React.memo(function CalculatorPanel() {
  const t = useTranslations('Dock')
  // Use individual selector instead of object destructuring for better performance
  const setShowCalculator = useDockedNavigationStore((state) => state.setShowCalculator)
  
  // Phase 4: Use Zustand store for better performance and persistence
  // Use shallow equality to prevent unnecessary re-renders
  const roomPlanMetadata = useSceneStore((state) => state.roomPlanMetadata)
  const wallMaterials = useSceneStore((state) => state.wallMaterials)
  const setWallMaterial = useSceneStore((state) => state.setWallMaterial)
  const resetCalculator = useSceneStore((state) => state.resetCalculator)
  
  // Draggable panel state
  const panelRef = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState<{ x: number; y: number } | null>(null) // null = default position (right: 1rem, top: 5rem)
  const [isDragging, setIsDragging] = React.useState(false)
  const dragStartRef = React.useRef<{ x: number; y: number } | null>(null)
  
  // Phase 4: Initialize materials with paint as default when walls are loaded
  // This only runs once when walls are first available
  const initializedWallsRef = React.useRef<Set<string>>(new Set())
  React.useEffect(() => {
    if (roomPlanMetadata?.walls) {
      roomPlanMetadata.walls.forEach((wall, index) => {
        const wallId = (wall as any).identifier || `wall-${index}`
        
        // Only initialize if not already set in store and not previously initialized
        if (!wallMaterials[wallId] && !initializedWallsRef.current.has(wallId)) {
          setWallMaterial(wallId, 'paint')
          initializedWallsRef.current.add(wallId)
        }
      })
      
      // Clean up initialized walls that no longer exist (when model changes)
      const currentWallIds = new Set(
        roomPlanMetadata.walls.map((wall, index) => 
          (wall as any).identifier || `wall-${index}`
        )
      )
      
      // Remove walls that no longer exist from initialized set
      initializedWallsRef.current.forEach(wallId => {
        if (!currentWallIds.has(wallId)) {
          initializedWallsRef.current.delete(wallId)
        }
      })
    }
  }, [roomPlanMetadata, wallMaterials, setWallMaterial])
  
  // Phase 4: Clean up initialized walls when model changes
  // This ensures we don't have stale wall IDs when switching models
  const previousWallCountRef = React.useRef<number>(0)
  React.useEffect(() => {
    const currentWallCount = roomPlanMetadata?.walls?.length ?? 0
    // If wall count changed significantly (new model), clean up initialized refs
    if (currentWallCount !== previousWallCountRef.current && previousWallCountRef.current > 0) {
      initializedWallsRef.current.clear()
    }
    previousWallCountRef.current = currentWallCount
  }, [roomPlanMetadata?.walls?.length])
  
  // Phase 4: Memoized calculation of walls with materials and prices
  // This prevents unnecessary recalculations on every render
  const wallsWithMaterials: WallWithMaterial[] = React.useMemo(() => {
    if (!roomPlanMetadata?.walls) return []
    
    return roomPlanMetadata.walls.map((wall, index) => {
      const wallId = (wall as any).identifier || `wall-${index}`
      const [width, height] = wall.dimensions || [0, 0]
      const surfaceArea = (wall as any).surfaceArea ?? (width * height)
      const material = wallMaterials[wallId] || 'paint'
      const materialPrice = MATERIAL_PRICES[material]
      const price = surfaceArea * materialPrice
      
      return {
        id: wallId,
        name: `Wall ${index + 1}`,
        dimensions: { width, height },
        surfaceArea,
        material,
        price,
      }
    })
  }, [roomPlanMetadata?.walls, wallMaterials]) // Only recalculate when walls or materials change
  
  // Phase 4: Memoized total price calculation
  const totalPrice = React.useMemo(() => {
    return wallsWithMaterials.reduce((sum, wall) => sum + wall.price, 0)
  }, [wallsWithMaterials])
  
  // Phase 4: Use Zustand store action instead of local state
  const handleMaterialChange = React.useCallback((wallId: string, material: MaterialType) => {
    setWallMaterial(wallId, material)
  }, [setWallMaterial])
  
  // Draggable panel handlers
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    // Only allow dragging from header (not buttons or interactive elements)
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('select')) {
      return
    }
    
    e.preventDefault()
    setIsDragging(true)
    
    const panel = panelRef.current
    if (!panel) return
    
    // Get current panel position
    const rect = panel.getBoundingClientRect()
    const currentX = position?.x ?? (window.innerWidth - rect.width - 16) // Default: right-4 (1rem = 16px)
    const currentY = position?.y ?? 80 // Default: top-20 (5rem = 80px)
    
    dragStartRef.current = {
      x: e.clientX - currentX,
      y: e.clientY - currentY,
    }
  }, [position])
  
  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return
    
    const panel = panelRef.current
    if (!panel) return
    
    const newX = e.clientX - dragStartRef.current.x
    const newY = e.clientY - dragStartRef.current.y
    
    // Constrain to viewport bounds
    const maxX = window.innerWidth - panel.offsetWidth
    const maxY = window.innerHeight - panel.offsetHeight
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    })
  }, [isDragging])
  
  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false)
    dragStartRef.current = null
  }, [])
  
  // Set up global mouse event listeners for dragging
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])
  
  if (!roomPlanMetadata?.walls || wallsWithMaterials.length === 0) {
    return null
  }
  
  return (
    <div 
      ref={panelRef}
      className={`fixed w-[28rem] max-h-[calc(100vh-6rem)] bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-[90] flex flex-col transition-all duration-200 ease-out ${isDragging ? 'cursor-grabbing' : 'cursor-default'}`}
      style={{
        ...(position 
          ? { left: `${position.x}px`, top: `${position.y}px` }
          : { right: '1rem', top: '5rem' }
        ),
      }}
    >
      {/* Header - Draggable */}
      <div 
        className={`sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 px-4 py-3 flex items-center justify-between z-10 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2 flex-1">
          <GripVertical className="w-4 h-4 text-gray-400 dark:text-gray-600 flex-shrink-0" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            {t('calculator', { default: 'Material Calculator' })}
          </h2>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowCalculator(false)
          }}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors flex-shrink-0"
          aria-label="Close calculator"
        >
          <PanelLeftClose className="w-5 h-5 text-gray-400 dark:text-gray-600" />
        </button>
      </div>
      
      {/* Content */}
      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-3">
          {wallsWithMaterials.map((wall) => (
            <div
              key={wall.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2"
            >
              {/* Wall Name */}
              <div className="font-medium text-sm text-gray-900 dark:text-white">
                {wall.name}
              </div>
              
              {/* Dimensions */}
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {wall.dimensions.width.toFixed(2)}m × {wall.dimensions.height.toFixed(2)}m ({wall.surfaceArea.toFixed(2)}m²)
              </div>
              
              {/* Material Selection */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  Material:
                </label>
                <select
                  value={wall.material}
                  onChange={(e) => {
                    const newMaterial = e.target.value as MaterialType
                    handleMaterialChange(wall.id, newMaterial)
                  }}
                  className="flex-1 text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
                >
                  <option value="paint">Paint ($10/m²)</option>
                  <option value="tile">Tile ($30/m²)</option>
                  <option value="microcement">Microcement ($100/m²)</option>
                </select>
              </div>
              
              {/* Price */}
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                ${wall.price.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      
      {/* Footer with Total */}
      <div className="sticky bottom-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200/50 dark:border-gray-700/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            Total:
          </span>
          <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
            ${totalPrice.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  )
})

export default CalculatorPanel
