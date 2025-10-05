"use client"

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { cameraPointUpdater } from '@/lib/utils/debouncedUpdater'
import * as THREE from 'three'
import { Eye, Ruler, Bird, Tangent, Lock, LockOpen } from 'lucide-react'

interface CameraPathEditor3DProps {
  cameraPoints: Array<{ x: number; y: number; z: number }>
  lookAtTargets: Array<{ x: number; y: number; z: number }>
  activePathId: string
  isBirdView: boolean
  isEditorEnabled: boolean
  onPointsChange: (points: Array<{ x: number; y: number; z: number }>) => void
  onLookAtTargetsChange: (targets: Array<{ x: number; y: number; z: number }>) => void
  onBirdViewToggle: () => void
  onToggleEditor: () => void
}

const CameraPathEditor3D: React.FC<CameraPathEditor3DProps> = ({
  cameraPoints,
  lookAtTargets,
  activePathId,
  isBirdView,
  isEditorEnabled,
  onPointsChange,
  onLookAtTargetsChange,
  onBirdViewToggle,
  onToggleEditor
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedDotIndex, setSelectedDotIndex] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [hoveredDotIndex, setHoveredDotIndex] = useState<number | null>(null)
  const [showLookAtTargets, setShowLookAtTargets] = useState(false)
  const [selectedLookAtIndex, setSelectedLookAtIndex] = useState<number | null>(null)
  const [hoveredLookAtIndex, setHoveredLookAtIndex] = useState<number | null>(null)
  const [selectedHeightIndex, setSelectedHeightIndex] = useState<number | null>(null)
  const [hoveredHeightIndex, setHoveredHeightIndex] = useState<number | null>(null)
  const [isBirdViewLocked, setIsBirdViewLocked] = useState<boolean>(false)
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; text: string }>({ visible: false, x: 0, y: 0, text: '' })
  const [showDebugHitAreas, setShowDebugHitAreas] = useState(false)

  useEffect(() => {
    ;(window as any).__birdViewLocked = isBirdViewLocked
  }, [isBirdViewLocked])
  const isLoadingRef = useRef(false)

  // Props are being received correctly

  // Remove all debug logging to eliminate leaks

  // Project 3D point to 2D screen coordinates (simple top-down view)
  const projectToScreen = useCallback((point: { x: number; y: number; z: number }) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    
    const width = canvas.width
    const height = canvas.height
    
    // Scale doubled to match 2x canvas size (1600x1200 instead of 800x600)
    const scale = 8
    const centerX = width / 2
    const centerY = height / 2
    const screenX = centerX + point.x * scale
    const screenY = centerY - point.z * scale // Flip Z for screen coordinates
    
    return { x: screenX, y: screenY }
  }, [])

  // Project 3D lookAt target to 2D screen coordinates
  const projectLookAtToScreen = useCallback((point: { x: number; y: number; z: number }) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    
    const width = canvas.width
    const height = canvas.height
    
    // Scale doubled to match 2x canvas size
    const scale = 8
    const centerX = width / 2
    const centerY = height / 2
    const screenX = centerX + point.x * scale
    const screenY = centerY - point.z * scale
    
    return { x: screenX, y: screenY }
  }, [])

  // Height editor functions
  const handleHeightClick = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('🎯 Height click triggered for point:', index)
    setSelectedHeightIndex(selectedHeightIndex === index ? null : index)
    setSelectedDotIndex(null) // Clear camera point selection
    setSelectedLookAtIndex(null) // Clear lookAt selection
  }, [selectedHeightIndex])

  const handleHeightChange = useCallback((index: number, newHeight: number) => {
    const newPoints = [...cameraPoints]
    newPoints[index] = { ...newPoints[index], y: newHeight }
    
    onPointsChange(newPoints)
    cameraPointUpdater.updatePoints(newPoints, lookAtTargets)
    
    // Update camera in real-time
    const camera = (window as any).scrollSceneCamera
    if (camera) {
      const point = newPoints[index]
      camera.position.set(point.x, point.y, point.z)
      
      // Force render
      const renderer = (window as any).scrollSceneRenderer
      const scene = (window as any).scrollSceneScene
      if (renderer && scene) {
        renderer.render(scene, camera)
      }
    }
  }, [cameraPoints, lookAtTargets, onPointsChange])

  // Convert screen coordinates back to 3D world coordinates
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0, z: 0 }
    
    const width = canvas.width
    const height = canvas.height
    
    // Scale doubled to match 2x canvas size
    const scale = 8
    const centerX = width / 2
    const centerY = height / 2
    const worldX = (screenX - centerX) / scale
    const worldZ = (centerY - screenY) / scale // Flip Z back
    
    // Preserve height by default; caller will inject current Y when needed
    return { x: worldX, y: 0, z: worldZ }
  }, [])

  // Load camera points from database
  const loadCameraPointsFromDatabase = useCallback(async () => {
    if (isLoadingRef.current) return
    
    // Only load from database if we don't already have camera points from props
    if (cameraPoints && cameraPoints.length > 0) {
      console.log('ℹ️ [CameraPathEditor3D] Using camera points from props:', cameraPoints.length)
      return
    }
    
    try {
      isLoadingRef.current = true
      console.log('🔄 [CameraPathEditor3D] Loading camera points from database...')
      
      const userId = cameraPointUpdater.getCurrentUserId()
      const sceneConfigId = cameraPointUpdater.getCurrentSceneConfigId()
      
      const response = await fetch(`/api/camera-path?userId=${userId}&sceneDesignConfigId=${sceneConfigId}`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.cameraPoints && data.cameraPoints.length > 0) {
          console.log('✅ [CameraPathEditor3D] Loaded camera points from database:', data.cameraPoints.length)
          onPointsChange(data.cameraPoints)
          if (data.lookAtTargets) {
            onLookAtTargetsChange(data.lookAtTargets)
          }
        } else {
          console.log('⚠️ [CameraPathEditor3D] No camera points found in database, keeping default points')
        }
      } else {
        console.warn('⚠️ [CameraPathEditor3D] Failed to load from database, keeping default points')
      }
    } catch (error) {
      console.error('[CameraPathEditor3D] Error loading from database:', error)
    } finally {
      isLoadingRef.current = false
    }
  }, [onPointsChange, onLookAtTargetsChange, cameraPoints])

  // Save camera points to database
  const saveCameraPointsToDatabase = useCallback(async (points: Array<{ x: number; y: number; z: number }>, targets: Array<{ x: number; y: number; z: number }>) => {
    try {
      const userId = cameraPointUpdater.getCurrentUserId()
      const sceneConfigId = cameraPointUpdater.getCurrentSceneConfigId()
      
      const response = await fetch('/api/camera-path', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          sceneDesignConfigId: sceneConfigId,
          cameraPoints: points,
          lookAtTargets: targets
        })
      })
      
      if (response.ok) {
        console.log('✅ [CameraPathEditor3D] Saved camera points to database')
      } else {
        console.error('❌ [CameraPathEditor3D] Failed to save to database')
      }
    } catch (error) {
      console.error('[CameraPathEditor3D] Error saving to database:', error)
    }
  }, [])

  // Component mounted - skip database load for now
  useEffect(() => {
    console.log('🎯 [CameraPathEditor3D] Component mounted, isBirdView:', isBirdView)
    // loadCameraPointsFromDatabase() // Skip for now to prevent errors
  }, []) // Remove dependencies to prevent re-running on every render

  // Draw the scene
  const drawScene = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !isEditorEnabled) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // console.log('🎨 [CameraPathEditor3D] Drawing scene with', cameraPoints.length, 'points')
    
    // Clear canvas completely
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw minimal grid for reference only
    const gridSize = 50 // Larger spacing
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)' // Much more subtle
    ctx.lineWidth = 0.3
    
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    
    // Vertical lines only in center area
    for (let x = centerX - 150; x <= centerX + 150; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, centerY - 75)
      ctx.lineTo(x, centerY + 75)
      ctx.stroke()
    }
    
    // Horizontal lines only in center area
    for (let y = centerY - 75; y <= centerY + 75; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(centerX - 150, y)
      ctx.lineTo(centerX + 150, y)
      ctx.stroke()
    }
    
    // Draw camera path lines (keep 1px)
    if (cameraPoints.length > 1) {
      ctx.strokeStyle = '#ffffff' // White color
      ctx.lineWidth = 1
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      
      for (let i = 0; i < cameraPoints.length; i++) {
        const screenPos = projectToScreen(cameraPoints[i])
        if (i === 0) {
          ctx.moveTo(screenPos.x, screenPos.y)
        } else {
          ctx.lineTo(screenPos.x, screenPos.y)
        }
      }
      ctx.stroke()
    }
    
    // Draw camera points with height indicators
    cameraPoints.forEach((point, index) => {
      const screenPos = projectToScreen(point)
      
      // Save context state
      ctx.save()
      
      // Always draw dots within reasonable bounds and make them very visible
      if (screenPos.x >= -100 && screenPos.x <= canvas.width + 100 && 
          screenPos.y >= -100 && screenPos.y <= canvas.height + 100) {
        
        // Draw height indicator line (subtle vertical line, keep 1px)
        if (point.y !== 0) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
          ctx.lineWidth = 1
          ctx.setLineDash([2, 2])
          ctx.beginPath()
          ctx.moveTo(screenPos.x, screenPos.y)
          ctx.lineTo(screenPos.x, screenPos.y - point.y * 4) // Scaled height visibility
          ctx.stroke()
          ctx.setLineDash([]) // Reset dash
        }
        
        // Draw bright, highly visible circle with hover state
        let fillColor = '#9333ea' // Default purple to match timeline waypoints
        if (selectedDotIndex === index) {
          fillColor = '#ff4444' // Selected red
        } else if (hoveredDotIndex === index) {
          fillColor = '#a855f7' // Hover purple-500
        }
        ctx.fillStyle = fillColor
        ctx.beginPath()
        ctx.arc(screenPos.x, screenPos.y, 20, 0, Math.PI * 2) // Doubled radius to match 2x canvas size
        ctx.fill()
        
        // Ring border like timeline waypoints (keep 1px)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
        ctx.lineWidth = 1
        ctx.stroke()
      }
      
      // Clear shadow
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetY = 0
      
      // Draw point number (1rem = 16px)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 16px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 1
      ctx.strokeText(index.toString(), screenPos.x, screenPos.y)
      ctx.fillText(index.toString(), screenPos.x, screenPos.y)
      
      // Draw height badge on hover or selection
      if (hoveredDotIndex === index || selectedHeightIndex === index) {
        // Draw rounded rectangle background (scaled 2x)
        const badgeWidth = 100
        const badgeHeight = 40
        const cornerRadius = 16
        const x = screenPos.x - badgeWidth / 2
        const y = screenPos.y - 70
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)'
        ctx.beginPath()
        ctx.roundRect(x, y, badgeWidth, badgeHeight, cornerRadius)
        ctx.fill()
        
        // Draw border (keep 1px)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
        ctx.lineWidth = 1
        ctx.stroke()
        
        ctx.fillStyle = '#ffffff'
        ctx.font = '16px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`Y: ${point.y.toFixed(1)}`, screenPos.x, screenPos.y - 50)
      }
      
      // Restore context state
      ctx.restore()
    })

    // Draw lookAt targets if enabled
    if (showLookAtTargets && lookAtTargets.length > 0) {
      lookAtTargets.forEach((target, index) => {
        const screenPos = projectLookAtToScreen(target)
        
        // Save context state
        ctx.save()
        
        // Draw orange spheres for lookAt targets
        if (screenPos.x >= -100 && screenPos.x <= canvas.width + 100 && 
            screenPos.y >= -100 && screenPos.y <= canvas.height + 100) {
          
          // Draw orange circle for lookAt target
          let fillColor = '#f97316' // orange-500
          if (selectedLookAtIndex === index) {
            fillColor = '#ea580c' // orange-600 (selected)
          } else if (hoveredLookAtIndex === index) {
            fillColor = '#fb923c' // orange-400 (hover)
          }
          ctx.fillStyle = fillColor
          ctx.beginPath()
          ctx.arc(screenPos.x, screenPos.y, 16, 0, Math.PI * 2) // Scaled 2x (8 -> 16)
          ctx.fill()
          
          // Ring border (keep 1px)
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
          ctx.lineWidth = 1
          ctx.stroke()
          
          // Draw "L" label for lookAt target (1rem = 16px)
          ctx.fillStyle = '#ffffff'
          ctx.font = 'bold 16px Arial'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.strokeStyle = '#000000'
          ctx.lineWidth = 1
          ctx.strokeText(`L${index}`, screenPos.x, screenPos.y)
          ctx.fillText(`L${index}`, screenPos.x, screenPos.y)
        }
        
        // Restore context state
        ctx.restore()
      })
    }

    // Draw debug hit areas if enabled
    if (showDebugHitAreas) {
      console.log('🎨 [CameraPathEditor3D] Drawing debug hit areas, cameraPoints:', cameraPoints.length, 'showLookAtTargets:', showLookAtTargets)
      
      // Draw camera point hit areas
      cameraPoints.forEach((point, index) => {
        const screenPos = projectToScreen(point)
        console.log(`🎨 [CameraPathEditor3D] Drawing debug circle for point ${index} at:`, screenPos)
        ctx.save()
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)' // Red debug circle - more visible
        ctx.lineWidth = 3
        ctx.setLineDash([8, 4])
        ctx.beginPath()
        ctx.arc(screenPos.x, screenPos.y, 20, 0, Math.PI * 2) // Match hit detection radius
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()
      })

      // Draw lookAt target hit areas
      if (showLookAtTargets) {
        lookAtTargets.forEach((target, index) => {
          const screenPos = projectLookAtToScreen(target)
          console.log(`🎨 [CameraPathEditor3D] Drawing debug circle for lookAt ${index} at:`, screenPos)
          ctx.save()
          ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)' // Green debug circle - more visible
          ctx.lineWidth = 3
          ctx.setLineDash([8, 4])
          ctx.beginPath()
          ctx.arc(screenPos.x, screenPos.y, 16, 0, Math.PI * 2) // Match hit detection radius
          ctx.stroke()
          ctx.setLineDash([])
          ctx.restore()
        })
      }
    }

    // Crosshair removed per request to avoid blocking UI panels
  }, [cameraPoints, lookAtTargets, isEditorEnabled, projectToScreen, projectLookAtToScreen, selectedDotIndex, hoveredDotIndex, selectedLookAtIndex, hoveredLookAtIndex, showLookAtTargets, mousePos, selectedHeightIndex, showDebugHitAreas])

  // Handle mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isEditorEnabled) return
    
    // Prevent event bubbling to avoid triggering underlying hotspot events
    e.preventDefault()
    e.stopPropagation()
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    
    // Calculate mouse position accounting for canvas scaling
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    
    // Check if clicking on a camera point
    for (let i = 0; i < cameraPoints.length; i++) {
      const screenPos = projectToScreen(cameraPoints[i])
      const distance = Math.sqrt((x - screenPos.x) ** 2 + (y - screenPos.y) ** 2)
      
      if (distance < 20) { // Match visual radius exactly
        // Check if double-click for height editing
        if (e.detail === 2) {
          console.log('🎯 Double-click detected on point:', i)
          handleHeightClick(i, e)
          return
        }
        
        // Check if right-click for height editing (alternative)
        if (e.button === 2) {
          console.log('🎯 Right-click detected on point:', i)
          handleHeightClick(i, e)
          return
        }
        
        setSelectedDotIndex(i)
        setSelectedLookAtIndex(null) // Clear lookAt selection
        setSelectedHeightIndex(null) // Clear height selection
        setIsDragging(true)
        setDragOffset({ x: x - screenPos.x, y: y - screenPos.y })
        break
      }
    }

    // Check if clicking on a lookAt target
    if (showLookAtTargets) {
      for (let i = 0; i < lookAtTargets.length; i++) {
        const screenPos = projectLookAtToScreen(lookAtTargets[i])
        const distance = Math.sqrt((x - screenPos.x) ** 2 + (y - screenPos.y) ** 2)
        
        if (distance < 16) { // Match visual radius exactly
          setSelectedLookAtIndex(i)
          setSelectedDotIndex(null) // Clear camera point selection
          setSelectedHeightIndex(null) // Clear height selection
          setIsDragging(true)
          setDragOffset({ x: x - screenPos.x, y: y - screenPos.y })
          break
        }
      }
    }
  }, [cameraPoints, lookAtTargets, isEditorEnabled, projectToScreen, projectLookAtToScreen, showLookAtTargets, handleHeightClick])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Prevent event bubbling to avoid triggering underlying hotspot events
    e.preventDefault()
    e.stopPropagation()
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    
    // Calculate mouse position accounting for canvas scaling
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const rawX = (e.clientX - rect.left) * scaleX
    const rawY = (e.clientY - rect.top) * scaleY
    
    // Always update mouse position for crosshair
    setMousePos({ x: rawX, y: rawY })
    
    // Check for hover detection on camera points
    for (let i = 0; i < cameraPoints.length; i++) {
      const screenPos = projectToScreen(cameraPoints[i])
      const distance = Math.sqrt((rawX - screenPos.x) ** 2 + (rawY - screenPos.y) ** 2)
      if (distance <= 20) {
        setHoveredDotIndex(i)
        setHoveredLookAtIndex(null) // Clear lookAt hover
        const canvas = canvasRef.current
        if (canvas) canvas.style.cursor = 'pointer'
        // Convert canvas coordinates to viewport coordinates for tooltip
        const canvasEl = canvasRef.current
        if (canvasEl) {
          const rect = canvasEl.getBoundingClientRect()
          const scaleX = rect.width / canvasEl.width
          const scaleY = rect.height / canvasEl.height
          
          // Debug logging for coordinate conversion
          console.log(`🎯 [CameraPathEditor3D] Point ${i} coordinate conversion:`, {
            canvasPos: screenPos,
            canvasSize: { width: canvasEl.width, height: canvasEl.height },
            rectSize: { width: rect.width, height: rect.height },
            scale: { scaleX, scaleY },
            viewportPos: { x: rect.left + screenPos.x * scaleX, y: rect.top + screenPos.y * scaleY }
          })
          
          // Tooltip removed per user request
          // setTooltip({ visible: true, x: viewportX, y: viewportY, text: `Point ${i}` })
        }
        break
      } else {
        setHoveredDotIndex(null)
        const canvas = canvasRef.current
        if (canvas) canvas.style.cursor = 'default'
        setTooltip(prev => ({ ...prev, visible: false }))
      }
    }

    // Check for hover detection on lookAt targets
    if (showLookAtTargets) {
      for (let i = 0; i < lookAtTargets.length; i++) {
        const screenPos = projectLookAtToScreen(lookAtTargets[i])
        const distance = Math.sqrt((rawX - screenPos.x) ** 2 + (rawY - screenPos.y) ** 2)
        if (distance <= 16) {
          setHoveredLookAtIndex(i)
          setHoveredDotIndex(null) // Clear camera point hover
          const canvas = canvasRef.current
          if (canvas) canvas.style.cursor = 'pointer'
          const center = projectLookAtToScreen(lookAtTargets[i])
          // Convert canvas coordinates to viewport coordinates for tooltip
          const canvasEl = canvasRef.current
          if (canvasEl) {
            const rect = canvasEl.getBoundingClientRect()
            const scaleX = rect.width / canvasEl.width
            const scaleY = rect.height / canvasEl.height
            
            // Debug logging for coordinate conversion
            console.log(`🎯 [CameraPathEditor3D] LookAt ${i} coordinate conversion:`, {
              canvasPos: center,
              canvasSize: { width: canvasEl.width, height: canvasEl.height },
              rectSize: { width: rect.width, height: rect.height },
              scale: { scaleX, scaleY },
              viewportPos: { x: rect.left + center.x * scaleX, y: rect.top + center.y * scaleY }
            })
            
            // Tooltip removed per user request
            // setTooltip({ visible: true, x: viewportX, y: viewportY, text: `L${i}` })
          }
          break
        } else {
          setHoveredLookAtIndex(null)
          const canvas = canvasRef.current
          if (canvas) canvas.style.cursor = hoveredDotIndex !== null ? 'pointer' : 'default'
          if (hoveredDotIndex === null) setTooltip(prev => ({ ...prev, visible: false }))
        }
      }
    }
    
    if (!isDragging || (!isEditorEnabled)) return
    
    const x = rawX - dragOffset.x
    const y = rawY - dragOffset.y
    
    // Convert screen coordinates to world coordinates
    const worldPos = screenToWorld(x, y)
    
    // Update camera point or lookAt target
    if (selectedDotIndex !== null) {
      // While dragging in editor, suppress camera resume in ScrollScene
      ;(window as any).__suppressCameraResume = true
      // Update camera point, preserving existing height
      const newPoints = [...cameraPoints]
      const currentY = cameraPoints[selectedDotIndex]?.y ?? 0
      newPoints[selectedDotIndex] = { x: worldPos.x, y: currentY, z: worldPos.z }
      
      // Visual feedback - redraw immediately
      onPointsChange(newPoints)
      
      // Enable debounced API save on drag
      cameraPointUpdater.updatePoints(newPoints, lookAtTargets)
    } else if (selectedLookAtIndex !== null) {
      ;(window as any).__suppressCameraResume = true
      // Update lookAt target, preserving existing height
      const newLookAtTargets = [...lookAtTargets]
      const currentY = lookAtTargets[selectedLookAtIndex]?.y ?? 0
      newLookAtTargets[selectedLookAtIndex] = { x: worldPos.x, y: currentY, z: worldPos.z }
      
      // Visual feedback - redraw immediately
      onLookAtTargetsChange(newLookAtTargets)
      
      // Update camera lookAt target in real-time
      const camera = (window as any).scrollSceneCamera
      if (camera && newLookAtTargets[selectedLookAtIndex]) {
        const target = newLookAtTargets[selectedLookAtIndex]
        camera.lookAt(target.x, target.y, target.z)
        
        // Force render to show the change immediately
        const renderer = (window as any).scrollSceneRenderer
        const scene = (window as any).scrollSceneScene
        if (renderer && scene) {
          renderer.render(scene, camera)
        }
      }
      
      // Enable debounced API save on drag
      cameraPointUpdater.updatePoints(cameraPoints, newLookAtTargets)
    }
    
    // Smooth dragging feedback
  }, [isDragging, selectedDotIndex, selectedLookAtIndex, dragOffset, cameraPoints, lookAtTargets, onPointsChange, onLookAtTargetsChange, screenToWorld, isEditorEnabled, projectToScreen, projectLookAtToScreen, showLookAtTargets])

  const handleMouseUp = useCallback((e?: React.MouseEvent) => {
    // Prevent event bubbling to avoid triggering underlying hotspot events
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    setIsDragging(false)
    setSelectedDotIndex(null)
    setSelectedLookAtIndex(null)
    // Re-enable camera resume after drag ends
    ;(window as any).__suppressCameraResume = false
  }, [])

  // Redraw when camera points change or editor is enabled
  useEffect(() => {
    if (isEditorEnabled && cameraPoints && cameraPoints.length > 0) {
      // console.log('🎨 [CameraPathEditor3D] Editor enabled with camera points, triggering drawScene')
      drawScene()
    }
  }, [drawScene, isEditorEnabled, cameraPoints])

  // Expose editor state to window for ScrollScene to detect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__isEditorEnabled = isEditorEnabled;
    }
  }, [isEditorEnabled])

  // Redraw when debug hit areas toggle changes
  useEffect(() => {
    if (isEditorEnabled && cameraPoints && cameraPoints.length > 0) {
      console.log('🎨 [CameraPathEditor3D] Debug hit areas toggled, showDebugHitAreas:', showDebugHitAreas)
      drawScene()
    }
  }, [drawScene, isEditorEnabled, cameraPoints, showDebugHitAreas])

  // Bird view toggle handler
  const handleBirdViewToggle = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎯 [CameraPathEditor3D] Bird view button clicked, current state:', isBirdView);
    
    // Dispatch custom event for bird view animation
    if (typeof window !== 'undefined') {
      console.log('🎯 [CameraPathEditor3D] Dispatching bird-view-animation event');
      const event = new CustomEvent('bird-view-animation', {
        detail: { isBirdView: !isBirdView }
      });
      console.log('🎯 [CameraPathEditor3D] Event created:', event);
      const dispatched = window.dispatchEvent(event);
      console.log('🎯 [CameraPathEditor3D] Event dispatched successfully:', dispatched);
    }
    
    onBirdViewToggle();
  }, [isBirdView, onBirdViewToggle]);

  return (
    <div className="fixed top-0 left-0 z-[100] w-full h-full pointer-events-none">
      {/* Consolidated Menu Buttons - Left aligned, vertical middle viewport - Compact Design */}
      <div className="fixed top-1/2 left-1 sm:left-2 transform -translate-y-1/2 z-[51] flex flex-col gap-1 origin-left pointer-events-auto">
        
        {/* 1. Bird View Row */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleBirdViewToggle}
            className={`w-8 h-8 p-2 rounded-md transition-all duration-200 flex items-center justify-center ${
              isBirdView
                ? 'bg-purple-500 text-white border border-purple-400 shadow-md hover:bg-purple-600 hover:shadow-lg'
                : 'bg-gray-800/90 text-gray-300 border border-gray-600/60 hover:bg-gray-700/90 shadow-sm'
            }`}
            title={isBirdView ? 'Switch to Camera View' : 'Switch to Bird View'}
          >
            <Bird size={16} />
          </button>
          {isBirdView && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsBirdViewLocked(prev => !prev);
              }}
              className={`w-8 h-8 p-2 rounded-md transition-all duration-200 flex items-center justify-center ${
                isBirdViewLocked
                  ? 'bg-purple-700 text-white border border-purple-500 shadow-md hover:bg-purple-800 hover:shadow-lg'
                  : 'bg-gray-800/90 text-gray-300 border border-gray-600/60 hover:bg-gray-700/90 shadow-sm'
              }`}
              title={isBirdViewLocked ? 'Unlock Bird View' : 'Lock Bird View'}
            >
              {isBirdViewLocked ? (
                <Lock size={16} />
              ) : (
                <LockOpen size={16} />
              )}
            </button>
          )}
        </div>

        {/* 2. Editor Enable Row */}
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleEditor();
            }}
            className={`w-8 h-8 p-2 rounded-md transition-all duration-200 flex items-center justify-center ${
              isEditorEnabled
                ? 'bg-purple-500 text-white border border-purple-400 shadow-md hover:bg-purple-600 hover:shadow-lg'
                : 'bg-gray-800/90 text-gray-300 border border-gray-600/60 hover:bg-gray-700/90 shadow-sm'
            }`}
            title={isEditorEnabled ? 'Disable Editor' : 'Enable Editor'}
          >
            <Tangent size={16} />
          </button>
          {isEditorEnabled && (
            <>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🎯 LookAt button clicked, current state:', showLookAtTargets);
                  setShowLookAtTargets(!showLookAtTargets);
                }}
                className={`w-8 h-8 p-2 rounded-md transition-all duration-200 flex items-center justify-center ${
                  showLookAtTargets
                    ? 'bg-purple-500 text-white border border-purple-400 shadow-md hover:bg-purple-600 hover:shadow-lg'
                    : 'bg-gray-800/90 text-gray-300 border border-gray-600/60 hover:bg-gray-700/90 shadow-sm'
                }`}
                title={showLookAtTargets ? 'Hide LookAt Targets' : 'Show LookAt Targets'}
              >
                <Eye size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (selectedDotIndex !== null) {
                    setSelectedHeightIndex(selectedDotIndex);
                  }
                }}
                className={`w-8 h-8 p-2 rounded-md transition-all duration-200 flex items-center justify-center ${
                  selectedHeightIndex !== null
                    ? 'bg-purple-500 text-white border border-purple-400 shadow-md hover:bg-purple-600 hover:shadow-lg'
                    : 'bg-gray-800/90 text-gray-300 border border-gray-600/60 hover:bg-gray-700/90 shadow-sm'
                }`}
                title="Edit Height (Select a point first)"
                disabled={selectedDotIndex === null}
              >
                <Ruler size={16} />
              </button>
            </>
          )}
        </div>
        {/* Debug: isBirdView = {isBirdView ? 'true' : 'false'} */}

        

      </div>

      {/* Height Control Panel - Under ruler button bottom edge */}
      {selectedHeightIndex !== null && (
        <div className="fixed top-1/2 left-4 transform -translate-y-1/2 translate-y-20 bg-gray-800 border-2 border-gray-600 rounded-lg p-4 pointer-events-auto z-[60] shadow-lg transform transition-all    duration-100 ease-out scale-100">
          <div className="text-white text-sm font-medium mb-2">
            Point {selectedHeightIndex} Height
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="-10"
              max="20"
              step="0.1"
              value={cameraPoints[selectedHeightIndex]?.y || 0}
              onChange={(e) => handleHeightChange(selectedHeightIndex, parseFloat(e.target.value))}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <input
              type="number"
              min="-10"
              max="20"
              step="0.1"
              value={cameraPoints[selectedHeightIndex]?.y || 0}
              onChange={(e) => handleHeightChange(selectedHeightIndex, parseFloat(e.target.value))}
              className="w-16 px-2 py-1 bg-gray-700 text-white text-xs rounded border border-gray-600"
            />
          </div>
          <button
            onClick={() => setSelectedHeightIndex(null)}
            className="mt-2 w-full px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded transition-colors"
          >
            Close
          </button>
        </div>
      )}

      {/* Canvas - only show when editor is enabled */}
      {isEditorEnabled && (
        <>
        {/* Tooltip */}
        {tooltip.visible && (
          <div
            className="fixed z-[102] px-2 py-1 rounded bg-black/80 text-white pointer-events-none"
            style={{ 
              left: `${tooltip.x}px`, 
              top: `${tooltip.y}px`, 
              fontSize: '1rem', 
              lineHeight: '1.25rem',
              transform: 'translate(-50%, -100%)'
            }}
          >
            {tooltip.text}
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={1600}
          height={1200}
          className="absolute top-0 left-0 pointer-events-auto"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            imageRendering: 'auto',
            width: '1600px',
            height: '1200px',
            maxWidth: '100%',
            maxHeight: '100%'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        </>
      )}
    </div>
  )
}

export default CameraPathEditor3D
