"use client"

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { cameraPointUpdater } from '@/lib/utils/debouncedUpdater'
import * as THREE from 'three'
import gsap from 'gsap'
import { Eye, Ruler, Bird, Waypoints, Lock, LockOpen, Route, RouteOff, Orbit } from 'lucide-react'
import { useCameraStore } from '@/lib/stores/cameraStore'
import { useThemeStore } from '@/lib/stores/themeStore'
import { useTranslations } from 'next-intl'
import { Slider } from '@/components/ui/slider'

// Canvas constants - Simple and optimized for 800x600 (4:3 aspect ratio)
const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600

// Simple scale formula: Higher = more zoom (bigger circles, smaller view)
//                       Lower = less zoom (smaller circles, wider view)
// Current scale 10 = 1 world unit shows as 10 pixels on canvas
const CANVAS_SCALE = 4

// Waypoint visual constants (in pixels)
const WAYPOINT_RADIUS = 12   // Diameter = 24px
const LOOKAT_RADIUS = 12     // Same size for lookAt targets  
const HIT_AREA_PADDING = 4   // Extra clickable area beyond visual radius

// Text size constants (in pixels)
const WAYPOINT_TEXT_SIZE = 12  // Font size for waypoint labels (0-8)
const LOOKAT_TEXT_SIZE = 12    // Font size for lookAt labels (L0-L8)
const HEIGHT_BADGE_TEXT_SIZE = 12 // Font size for height display (Y: X.X)

// Props are now optional - component reads from Zustand store
interface CameraPathEditor3DProps {
  activePathId?: string
}

const CameraPathEditor3D: React.FC<CameraPathEditor3DProps> = ({
  activePathId = 'main-camera-path'
}) => {
  const t = useTranslations('CameraPathEditor')
  const { resolvedTheme } = useThemeStore()
  
  // Subscribe to Zustand store instead of using props
  const {
    cameraPoints: storeCameraPoints,
    lookAtTargets: storeLookAtTargets,
    cameraType,
    orbitalHeight,
    isBirdView,
    isEditorEnabled,
    showLookAtTargets,
    selectedHeightIndex,
    isBirdViewLocked,
    cameraRef,
    rendererRef,
    sceneRef,
    updateCameraPoint,
    updateLookAtTarget,
    setCameraPoints,
    setLookAtTargets,
    toggleCameraType,
    setOrbitalHeight,
    toggleBirdView,
    toggleBirdViewLock,
    toggleEditor,
    toggleLookAtTargets,
    setSelectedHeightIndex,
    showPathVisuals,
    togglePathVisuals,
  } = useCameraStore()
  
  // Convert store data to local format
  const cameraPoints = storeCameraPoints
  const lookAtTargets = storeLookAtTargets
  const isDebug = false
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedDotIndex, setSelectedDotIndex] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const [hoveredDotIndex, setHoveredDotIndex] = useState<number | null>(null)
  const [selectedLookAtIndex, setSelectedLookAtIndex] = useState<number | null>(null)
  const [hoveredLookAtIndex, setHoveredLookAtIndex] = useState<number | null>(null)
  const [hoveredHeightIndex, setHoveredHeightIndex] = useState<number | null>(null)
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; text: string }>({ visible: false, x: 0, y: 0, text: '' })
  const [showDebugHitAreas, setShowDebugHitAreas] = useState(false)
  
  // Sync window global for backwards compatibility
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
    
    const centerX = width / 2
    const centerY = height / 2
    const screenX = centerX + point.x * CANVAS_SCALE
    const screenY = centerY - point.z * CANVAS_SCALE // Flip Z for screen coordinates
    
    return { x: screenX, y: screenY }
  }, [])

  // Project 3D lookAt target to 2D screen coordinates
  const projectLookAtToScreen = useCallback((point: { x: number; y: number; z: number }) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    
    const width = canvas.width
    const height = canvas.height
    
    const centerX = width / 2
    const centerY = height / 2
    const screenX = centerX + point.x * CANVAS_SCALE
    const screenY = centerY - point.z * CANVAS_SCALE
    
    return { x: screenX, y: screenY }
  }, [])

  // Height editor functions
  const handleHeightClick = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isDebug) console.log('🎯 Height click triggered for point:', index)
    setSelectedHeightIndex(selectedHeightIndex === index ? null : index)
    setSelectedDotIndex(null) // Clear camera point selection
    setSelectedLookAtIndex(null) // Clear lookAt selection
  }, [selectedHeightIndex])

  const handleHeightChange = useCallback((index: number, newHeight: number) => {
    const newPoints = [...cameraPoints]
    newPoints[index] = { ...newPoints[index], y: newHeight }
    
    // Update 3D camera FIRST (before store update)
    const camera = (window as any).sceneEditorCamera || (window as any).scrollSceneCamera
    const renderer = (window as any).sceneEditorRenderer || (window as any).scrollSceneRenderer
    const scene = (window as any).sceneEditorScene || (window as any).scrollSceneScene
    
    if (camera && renderer && scene) {
      const point = newPoints[index]
      
      // Direct position update
      camera.position.x = point.x
      camera.position.y = point.y
      camera.position.z = point.z
      camera.updateMatrixWorld(true)
      
      // Force immediate render - critical for real-time feedback
      renderer.render(scene, camera)
    }
    
    // Update store AFTER visual feedback (for 2D canvas and persistence)
    setCameraPoints(newPoints)
    cameraPointUpdater.updatePoints(newPoints, lookAtTargets)
  }, [cameraPoints, lookAtTargets, setCameraPoints])

  // Convert screen coordinates back to 3D world coordinates
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0, z: 0 }
    
    const width = canvas.width
    const height = canvas.height
    
    const centerX = width / 2
    const centerY = height / 2
    const worldX = (screenX - centerX) / CANVAS_SCALE
    const worldZ = (centerY - screenY) / CANVAS_SCALE // Flip Z back
    
    // Preserve height by default; caller will inject current Y when needed
    return { x: worldX, y: 0, z: worldZ }
  }, [])

  // Load camera points from database
  const loadCameraPointsFromDatabase = useCallback(async () => {
    if (isLoadingRef.current) return
    
    // Only load from database if we don't already have camera points from props
    if (cameraPoints && cameraPoints.length > 0) {
      if (isDebug) console.log('ℹ️ [CameraPathEditor3D] Using camera points from props:', cameraPoints.length)
      return
    }
    
    try {
      isLoadingRef.current = true
      if (isDebug) console.log('🔄 [CameraPathEditor3D] Loading camera points from database...')
      
      const userId = cameraPointUpdater.getCurrentUserId()
      const sceneConfigId = cameraPointUpdater.getCurrentSceneConfigId()
      
      const response = await fetch(`/api/camera-path?userId=${userId}&sceneDesignConfigId=${sceneConfigId}`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.cameraPoints && data.cameraPoints.length > 0) {
          if (isDebug) console.log('✅ [CameraPathEditor3D] Loaded camera points from database:', data.cameraPoints.length)
          setCameraPoints(data.cameraPoints)
          if (data.lookAtTargets) {
            setLookAtTargets(data.lookAtTargets)
          }
        } else {
          if (isDebug) console.log('⚠️ [CameraPathEditor3D] No camera points found in database, keeping default points')
        }
      } else {
        if (isDebug) console.warn('⚠️ [CameraPathEditor3D] Failed to load from database, keeping default points')
      }
    } catch (error) {
      if (isDebug) console.error('[CameraPathEditor3D] Error loading from database:', error)
    } finally {
      isLoadingRef.current = false
    }
  }, [setCameraPoints, setLookAtTargets, cameraPoints])

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
        if (isDebug) console.log('✅ [CameraPathEditor3D] Saved camera points to database')
      } else {
        if (isDebug) console.error('❌ [CameraPathEditor3D] Failed to save to database')
      }
    } catch (error) {
      if (isDebug) console.error('[CameraPathEditor3D] Error saving to database:', error)
    }
  }, [])

  // Component mounted - skip database load for now
  useEffect(() => {
    if (isDebug) console.log('🎯 [CameraPathEditor3D] Component mounted, isBirdView:', isBirdView)
    // loadCameraPointsFromDatabase() // Skip for now to prevent errors
  }, []) // Remove dependencies to prevent re-running on every render

  // Draw the scene
  const drawScene = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !isEditorEnabled) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
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
          ctx.lineTo(screenPos.x, screenPos.y - point.y * CANVAS_SCALE) // Height scaled proportionally
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
        ctx.arc(screenPos.x, screenPos.y, WAYPOINT_RADIUS, 0, Math.PI * 2)
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
      
      // Draw point number
      ctx.fillStyle = '#ffffff'
      ctx.font = `bold ${WAYPOINT_TEXT_SIZE}px Arial`
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
        ctx.font = `${HEIGHT_BADGE_TEXT_SIZE}px Arial`
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
        
        // Draw orange spheres for lookAt targets (with wider bounds to show off-screen targets)
        if (screenPos.x >= -200 && screenPos.x <= canvas.width + 200 && 
            screenPos.y >= -200 && screenPos.y <= canvas.height + 200) {
          
          // Draw orange circle for lookAt target
          let fillColor = '#f97316' // orange-500
          if (selectedLookAtIndex === index) {
            fillColor = '#ea580c' // orange-600 (selected)
          } else if (hoveredLookAtIndex === index) {
            fillColor = '#fb923c' // orange-400 (hover)
          }
          ctx.fillStyle = fillColor
          ctx.beginPath()
          ctx.arc(screenPos.x, screenPos.y, LOOKAT_RADIUS, 0, Math.PI * 2)
          ctx.fill()
          
          // Ring border (keep 1px)
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
          ctx.lineWidth = 1
          ctx.stroke()
          
          // Draw "L" label for lookAt target
          ctx.fillStyle = '#ffffff'
          ctx.font = `bold ${LOOKAT_TEXT_SIZE}px Arial`
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
      if (isDebug) console.log('🎨 [CameraPathEditor3D] Drawing debug hit areas, cameraPoints:', cameraPoints.length, 'showLookAtTargets:', showLookAtTargets)
      
      // Draw camera point hit areas
      cameraPoints.forEach((point, index) => {
        const screenPos = projectToScreen(point)
        if (isDebug) console.log(`🎨 [CameraPathEditor3D] Drawing debug circle for point ${index} at:`, screenPos)
        ctx.save()
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)' // Red debug circle - more visible
        ctx.lineWidth = 3
        ctx.setLineDash([8, 4])
        ctx.beginPath()
        ctx.arc(screenPos.x, screenPos.y, WAYPOINT_RADIUS + HIT_AREA_PADDING, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()
      })

      // Draw lookAt target hit areas
      if (showLookAtTargets) {
        lookAtTargets.forEach((target, index) => {
          const screenPos = projectLookAtToScreen(target)
          if (isDebug) console.log(`🎨 [CameraPathEditor3D] Drawing debug circle for lookAt ${index} at:`, screenPos)
          ctx.save()
          ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)' // Green debug circle - more visible
          ctx.lineWidth = 3
          ctx.setLineDash([8, 4])
          ctx.beginPath()
          ctx.arc(screenPos.x, screenPos.y, LOOKAT_RADIUS + HIT_AREA_PADDING, 0, Math.PI * 2)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.restore()
        })
      }
    }

    // Crosshair removed per request to avoid blocking UI panels
  }, [cameraPoints, lookAtTargets, isEditorEnabled, projectToScreen, projectLookAtToScreen, selectedDotIndex, hoveredDotIndex, selectedLookAtIndex, hoveredLookAtIndex, showLookAtTargets, selectedHeightIndex, showDebugHitAreas])

  // Handle mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    console.log('🖱️ [MOUSEDOWN] Handler called!', { 
      isEditorEnabled, 
      showLookAtTargets,
      lookAtTargetsCount: lookAtTargets.length,
      cameraPointsCount: cameraPoints.length
    });
    
    if (!isEditorEnabled) {
      console.log('❌ [MOUSEDOWN] Editor not enabled, returning');
      return;
    }
    
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
      
      if (distance < WAYPOINT_RADIUS + HIT_AREA_PADDING) { // Hit area includes padding
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
        
        // Set flags immediately when drag starts
        ;(window as any).__suppressCameraResume = true
        ;(window as any).__pauseAnimationLoop = true
        
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
      console.log('🔍 [MOUSEDOWN] Checking lookAt targets, count:', lookAtTargets.length, 'showLookAtTargets:', showLookAtTargets);
      for (let i = 0; i < lookAtTargets.length; i++) {
        const screenPos = projectLookAtToScreen(lookAtTargets[i])
        const distance = Math.sqrt((x - screenPos.x) ** 2 + (y - screenPos.y) ** 2)
        
        console.log(`🔍 [MOUSEDOWN] LookAt ${i} distance:`, distance, 'threshold:', LOOKAT_RADIUS + HIT_AREA_PADDING);
        
        if (distance < LOOKAT_RADIUS + HIT_AREA_PADDING) { // Hit area includes padding
          console.log('✅ [MOUSEDOWN] LookAt target selected:', i);
          
          // Set flags immediately when drag starts
          ;(window as any).__suppressCameraResume = true
          ;(window as any).__pauseAnimationLoop = true
          
          setSelectedLookAtIndex(i)
          setSelectedDotIndex(null) // Clear camera point selection
          setSelectedHeightIndex(null) // Clear height selection
          setIsDragging(true)
          setDragOffset({ x: x - screenPos.x, y: y - screenPos.y })
          break
        }
      }
    } else {
      console.log('❌ [MOUSEDOWN] showLookAtTargets is false, not checking lookAt targets');
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
    
    // Update mouse position without triggering React re-render
    mousePosRef.current = { x: rawX, y: rawY }
    
    // Check for hover detection on camera points (compute first, then set state if changed)
    let nextHoveredDot: number | null = null
    for (let i = 0; i < cameraPoints.length; i++) {
      const screenPos = projectToScreen(cameraPoints[i])
      const distance = Math.sqrt((rawX - screenPos.x) ** 2 + (rawY - screenPos.y) ** 2)
      if (distance <= WAYPOINT_RADIUS + HIT_AREA_PADDING) {
        nextHoveredDot = i
        break
      }
    }
    if (nextHoveredDot !== hoveredDotIndex) {
      setHoveredDotIndex(nextHoveredDot)
      if (nextHoveredDot !== null) {
        setHoveredLookAtIndex(null)
        const canvas = canvasRef.current
        if (canvas) canvas.style.cursor = 'pointer'
      } else {
        const canvas = canvasRef.current
        if (canvas) canvas.style.cursor = 'default'
        setTooltip(prev => ({ ...prev, visible: false }))
      }
    }

    // Check for hover detection on lookAt targets
    if (showLookAtTargets) {
      let nextHoveredLookAt: number | null = null
      for (let i = 0; i < lookAtTargets.length; i++) {
        const screenPos = projectLookAtToScreen(lookAtTargets[i])
        const distance = Math.sqrt((rawX - screenPos.x) ** 2 + (rawY - screenPos.y) ** 2)
        if (distance <= LOOKAT_RADIUS + HIT_AREA_PADDING) {
          nextHoveredLookAt = i
          break
        }
      }
      if (nextHoveredLookAt !== hoveredLookAtIndex) {
        setHoveredLookAtIndex(nextHoveredLookAt)
        if (nextHoveredLookAt !== null) {
          setHoveredDotIndex(null)
          const canvas = canvasRef.current
          if (canvas) canvas.style.cursor = 'pointer'
        } else {
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
    
    console.log('🎯 [DRAG] Dragging:', { 
      selectedDotIndex, 
      selectedLookAtIndex, 
      isDragging, 
      worldPos 
    });
    
    // Update camera point or lookAt target
    if (selectedDotIndex !== null) {
      console.log('📍 [DRAG] Dragging waypoint:', selectedDotIndex);
      // CRITICAL: Set flags FIRST before any store updates to prevent curve regeneration
      ;(window as any).__suppressCameraResume = true
      ;(window as any).__pauseAnimationLoop = true
      
      // Update camera point, preserving existing height
      const newPoints = [...cameraPoints]
      const currentY = cameraPoints[selectedDotIndex]?.y ?? 0
      newPoints[selectedDotIndex] = { x: worldPos.x, y: currentY, z: worldPos.z }
      
      // Update 3D camera FIRST (before store update)
      const camera = (window as any).sceneEditorCamera || (window as any).scrollSceneCamera
      const renderer = (window as any).sceneEditorRenderer || (window as any).scrollSceneRenderer
      const scene = (window as any).sceneEditorScene || (window as any).scrollSceneScene
      
      if (camera && renderer && scene) {
        // Kill any GSAP animations on camera to prevent interference
        gsap.killTweensOf(camera.position);
        gsap.killTweensOf(camera.quaternion);
        gsap.killTweensOf(camera);
        
        const point = newPoints[selectedDotIndex]
        
        // Direct position update
        camera.position.x = point.x
        camera.position.y = point.y
        camera.position.z = point.z
        camera.updateMatrixWorld(true)
        
        // Update lookAt to the corresponding target if it exists
        if (lookAtTargets && lookAtTargets[selectedDotIndex]) {
          const lookAtTarget = lookAtTargets[selectedDotIndex]
          camera.lookAt(lookAtTarget.x, lookAtTarget.y, lookAtTarget.z)
          camera.updateMatrixWorld(true)
        }
        
        // Force immediate render - critical for real-time feedback
        renderer.render(scene, camera)
      }
      
      // Update store AFTER visual feedback (for 2D canvas and persistence)
      updateCameraPoint(selectedDotIndex, newPoints[selectedDotIndex])
      
      // Enable debounced API save on drag
      cameraPointUpdater.updatePoints(newPoints, lookAtTargets)
    } else if (selectedLookAtIndex !== null) {
      console.log('👁️ [DRAG] Dragging lookAt target:', selectedLookAtIndex);
      console.log('👁️ [DRAG] Bird view state before:', { 
        storeBirdView: isBirdView,
        windowBirdView: (window as any).__isBirdView,
        birdViewLocked: (window as any).__birdViewLocked
      });
      
      // CRITICAL: Set flags FIRST before any store updates
      ;(window as any).__suppressCameraResume = true
      ;(window as any).__pauseAnimationLoop = true
      
      // CRITICAL: Temporarily disable bird view to show camera perspective from waypoint
      ;(window as any).__isBirdView = false
      ;(window as any).__tempDisableBirdView = true  // Flag to track temporary disable
      
      console.log('👁️ [DRAG] Bird view state after:', { 
        windowBirdView: (window as any).__isBirdView,
        tempDisable: (window as any).__tempDisableBirdView
      });
      
      // Update lookAt target, preserving existing height
      const newLookAtTargets = [...lookAtTargets]
      const currentY = lookAtTargets[selectedLookAtIndex]?.y ?? 0
      newLookAtTargets[selectedLookAtIndex] = { x: worldPos.x, y: currentY, z: worldPos.z }
      
      // Update 3D camera lookAt FIRST (before store update)
      const camera = (window as any).sceneEditorCamera || (window as any).scrollSceneCamera
      const renderer = (window as any).sceneEditorRenderer || (window as any).scrollSceneRenderer
      const scene = (window as any).sceneEditorScene || (window as any).scrollSceneScene
      
      if (camera && renderer && scene && newLookAtTargets[selectedLookAtIndex]) {
        const target = newLookAtTargets[selectedLookAtIndex]
        
        // CRITICAL: Ensure camera is at the correct waypoint position first
        const correspondingWaypoint = cameraPoints[selectedLookAtIndex]
        if (correspondingWaypoint) {
          camera.position.x = correspondingWaypoint.x
          camera.position.y = correspondingWaypoint.y
          camera.position.z = correspondingWaypoint.z
        }
        
        // Update camera lookAt direction
        camera.lookAt(target.x, target.y, target.z)
        camera.updateMatrixWorld(true)
        
        console.log('👁️ [LOOKAT DRAG] Camera position:', camera.position.x, camera.position.y, camera.position.z);
        console.log('👁️ [LOOKAT DRAG] Looking at:', target.x, target.y, target.z);
        console.log('👁️ [LOOKAT DRAG] Camera quaternion:', camera.quaternion.x, camera.quaternion.y, camera.quaternion.z, camera.quaternion.w);
        console.log('👁️ [LOOKAT DRAG] Pause flags:', {
          pauseLoop: (window as any).__pauseAnimationLoop,
          suppressResume: (window as any).__suppressCameraResume,
          birdViewLocked: (window as any).__birdViewLocked,
          isBirdView: (window as any).__isBirdView
        });
        
        // Force immediate render - critical for real-time feedback
        renderer.render(scene, camera)
        console.log('✅ [LOOKAT DRAG] Render complete');
        
        // Verify camera state immediately after render
        console.log('🔍 [LOOKAT DRAG] Camera state after render:', {
          position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
          quaternion: { x: camera.quaternion.x, y: camera.quaternion.y, z: camera.quaternion.z, w: camera.quaternion.w }
        });
        
        // Check if GSAP is overriding our changes and kill any active tweens
        const gsapData = (camera.position as any)._gsap;
        if (gsapData) {
          console.log('⚠️ [LOOKAT DRAG] GSAP is controlling camera position!', gsapData);
        }
        
        // Always kill GSAP animations during lookAt drag to prevent interference
        gsap.killTweensOf(camera.position);
        gsap.killTweensOf(camera.quaternion);
        gsap.killTweensOf(camera);
        console.log('🔪 [LOOKAT DRAG] Killed all GSAP animations on camera');
        
        // Force another render on next frame to ensure visibility
        requestAnimationFrame(() => {
          if (renderer && scene && camera) {
            renderer.render(scene, camera);
            console.log('✅ [LOOKAT DRAG] Second render complete');
            console.log('🔍 [LOOKAT DRAG] Final camera position:', camera.position.x, camera.position.y, camera.position.z);
          }
        });
      } else {
        console.error('❌ [LOOKAT DRAG] Missing refs:', { camera: !!camera, renderer: !!renderer, scene: !!scene });
      }
      
      // Update store AFTER visual feedback (for 2D canvas and persistence)
      updateLookAtTarget(selectedLookAtIndex, newLookAtTargets[selectedLookAtIndex])
      
      // Enable debounced API save on drag
      cameraPointUpdater.updatePoints(cameraPoints, newLookAtTargets)
    }
    
    // Smooth dragging feedback
  }, [isDragging, selectedDotIndex, selectedLookAtIndex, dragOffset, cameraPoints, lookAtTargets, updateCameraPoint, updateLookAtTarget, screenToWorld, isEditorEnabled, projectToScreen, projectLookAtToScreen, showLookAtTargets, hoveredDotIndex, hoveredLookAtIndex])

  const handleMouseUp = useCallback((e?: React.MouseEvent) => {
    // Prevent event bubbling to avoid triggering underlying hotspot events
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    // Restore bird view if it was active before drag
    if (isBirdView && (window as any).__tempDisableBirdView) {
      console.log('🔄 [DRAG END] Restoring bird view state');
      ;(window as any).__isBirdView = true
      delete (window as any).__tempDisableBirdView
    }
    
    setIsDragging(false)
    setSelectedDotIndex(null)
    setSelectedLookAtIndex(null)
    
    // Re-enable camera resume and animation loop after a delay
    // This ensures the manual camera position/lookAt is visible before animation resumes
    setTimeout(() => {
      ;(window as any).__suppressCameraResume = false
      ;(window as any).__pauseAnimationLoop = false
      console.log('🔄 [DRAG END] Animation loop resumed after delay');
    }, 500); // 500ms delay to let user see the changes
  }, [isBirdView])

  // Redraw when camera points change or editor is enabled
  useEffect(() => {
    if (isEditorEnabled && cameraPoints && cameraPoints.length > 0) {
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
    if (isEditorEnabled) {
      drawScene()
    }
  }, [showDebugHitAreas])

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
    
    toggleBirdView();
  }, [isBirdView, toggleBirdView]);

  return (
    <div className="relative w-full min-h-[600px] pointer-events-none">
      {/* Consolidated Menu Buttons - Left aligned, top aligned - Compact Design */}
      <div className="relative top-0 left-0 z-[51] flex flex-col gap-1 origin-left pointer-events-auto mb-2">
        
        {/* 0. Camera Type Toggle Row (UI only) */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleCameraType();
            }}
            className={`w-8 h-8 p-2 rounded-md transition-all duration-200 flex items-center justify-center flex-shrink-0 ${
              cameraType === 'orbital'
                ? 'bg-green-600 text-white border border-green-500 shadow-md hover:bg-green-700 hover:shadow-lg'
                : 'bg-blue-600 text-white border border-blue-500 shadow-md hover:bg-blue-700 hover:shadow-lg'
            }`}
            title={cameraType === 'orbital' ? t('switchToPath') : t('switchToOrbital')}
          >
            {cameraType === 'orbital' ? <Orbit size={16} /> : <Route size={16} />}
          </button>
          
          {/* Orbital Height Slider - Only visible in orbital mode */}
          {cameraType === 'orbital' && (
            <div 
              className={`flex items-center gap-2 backdrop-blur-md border rounded-md px-2 py-1 ${
                resolvedTheme === 'light'
                  ? 'bg-white/90 border-gray-200/50'
                  : 'bg-gray-800/90 border-gray-600'
              }`}
              style={{ width: '150px' }}
            >
              <Slider
                min={0}
                max={100}
                step={1}
                value={[orbitalHeight]}
                onValueChange={(values) => setOrbitalHeight(values[0])}
                className="flex-1"
              />
              <span 
                className={`text-xs font-mono flex-shrink-0 ${
                  resolvedTheme === 'light' ? 'text-gray-900' : 'text-white'
                }`} 
                style={{ width: '28px' }}
              >
                {orbitalHeight}
              </span>
            </div>
          )}
        </div>
        
        {/* 1. Bird View Row */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleBirdViewToggle}
            className={`w-8 h-8 p-2 rounded-md transition-all duration-200 flex items-center justify-center ${
              isBirdView
                ? 'bg-purple-500 text-white border border-purple-400 shadow-md hover:bg-purple-600 hover:shadow-lg'
                : 'bg-white/90 dark:bg-gray-900/90 text-gray-600 dark:text-gray-300 border border-gray-200/50 dark:border-gray-600/50 hover:bg-gray-100 dark:hover:bg-gray-800/90 shadow-sm'
            }`}
            title={isBirdView ? t('switchToCameraView') : t('switchToBirdView')}
          >
            <Bird size={16} />
          </button>
          {isBirdView && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleBirdViewLock();
              }}
              className={`w-8 h-8 p-2 rounded-md transition-all duration-200 flex items-center justify-center ${
                isBirdViewLocked
                  ? 'bg-purple-700 text-white border border-purple-500 shadow-md hover:bg-purple-800 hover:shadow-lg'
                  : 'bg-white/90 dark:bg-gray-900/90 text-gray-600 dark:text-gray-300 border border-gray-200/50 dark:border-gray-600/50 hover:bg-gray-100 dark:hover:bg-gray-800/90 shadow-sm'
              }`}
              title={isBirdViewLocked ? t('unlockBirdView') : t('lockBirdView')}
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
              toggleEditor();
            }}
            className={`w-8 h-8 p-2 rounded-md transition-all duration-200 flex items-center justify-center ${
              isEditorEnabled
                ? 'bg-purple-500 text-white border border-purple-400 shadow-md hover:bg-purple-600 hover:shadow-lg'
                : 'bg-white/90 dark:bg-gray-900/90 text-gray-600 dark:text-gray-300 border border-gray-200/50 dark:border-gray-600/50 hover:bg-gray-100 dark:hover:bg-gray-800/90 shadow-sm'
            }`}
            title={isEditorEnabled ? t('disableEditor') : t('enableEditor')}
          >
            <Waypoints size={16} />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              togglePathVisuals();
            }}
            className={`w-8 h-8 p-2 rounded-md transition-all duration-200 flex items-center justify-center ${
              showPathVisuals
                ? 'bg-purple-500 text-white border border-purple-400 shadow-md hover:bg-purple-600 hover:shadow-lg'
                : 'bg-white/90 dark:bg-gray-900/90 text-gray-600 dark:text-gray-300 border border-gray-200/50 dark:border-gray-600/50 hover:bg-gray-100 dark:hover:bg-gray-800/90 shadow-sm'
            }`}
            title={showPathVisuals ? 'Hide Path Visuals in Camera View' : 'Show Path Visuals in Camera View'}
          >
            {showPathVisuals ? <Route size={16} /> : <RouteOff size={16} />}
          </button>
          {isEditorEnabled && (
            <>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🎯 LookAt button clicked, current state:', showLookAtTargets);
                  toggleLookAtTargets();
                }}
                className={`w-8 h-8 p-2 rounded-md transition-all duration-200 flex items-center justify-center ${
                  showLookAtTargets
                    ? 'bg-purple-500 text-white border border-purple-400 shadow-md hover:bg-purple-600 hover:shadow-lg'
                    : 'bg-white/90 dark:bg-gray-900/90 text-gray-600 dark:text-gray-300 border border-gray-200/50 dark:border-gray-600/50 hover:bg-gray-100 dark:hover:bg-gray-800/90 shadow-sm'
                }`}
                title={showLookAtTargets ? t('hideLookAtTargets') : t('showLookAtTargets')}
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
                    : 'bg-white/90 dark:bg-gray-900/90 text-gray-600 dark:text-gray-300 border border-gray-200/50 dark:border-gray-600/50 hover:bg-gray-100 dark:hover:bg-gray-800/90 shadow-sm'
                }`}
                title={t('editHeight')}
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
            {t('pointHeight', { index: selectedHeightIndex })}
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
            {t('close')}
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
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="absolute top-0 left-0 pointer-events-auto"
          style={{ 
            aspectRatio: '4/3',
            maxHeight: '100%',
            imageRendering: 'auto'  
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
