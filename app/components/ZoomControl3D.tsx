"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { ZoomIn } from 'lucide-react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { SCENE_CONFIG } from '../../lib/config/sceneConfig';

interface ZoomControl3DProps {
  className?: string;
  cameraRef?: React.MutableRefObject<THREE.PerspectiveCamera | undefined>;
  sceneRef?: React.MutableRefObject<THREE.Scene | undefined>;
  rendererRef?: React.MutableRefObject<THREE.WebGLRenderer | undefined>;
}

export default function ZoomControl3D({ 
  className = '',
  cameraRef,
  sceneRef,
  rendererRef
}: ZoomControl3DProps) {
  // Zoom levels - define constants first
  // Match camera start position: (35.36, ORBITAL_HEIGHT, 35.36) at 45° angle, radius ORBITAL_RADIUS
  // Use ORBITAL_RADIUS and ORBITAL_HEIGHT from sceneConfig.ts for consistency with SceneEditor
  const MIN_DISTANCE = 3; // Closest zoom distance
  const MAX_DISTANCE = 200; // Farthest zoom distance
  const DEFAULT_DISTANCE: number = SCENE_CONFIG.ORBITAL_RADIUS; // Default zoom distance (from sceneConfig)
  const DEFAULT_ORBITAL_HEIGHT: number = SCENE_CONFIG.ORBITAL_HEIGHT; // Use ORBITAL_HEIGHT from sceneConfig to match SceneEditor
  const ZOOM_DURATION = 0.3; // Animation duration in seconds for smooth response
  const ZOOM_TARGET = new THREE.Vector3(0, 0, 0); // World origin
  
  // Sensitivity for drag-based zooming (distance change per pixel)
  const DRAG_SENSITIVITY = 0.15; // units per pixel
  
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isDraggingRef = useRef(false);
  const isZoomingRef = useRef(false);
  const lastDragYRef = useRef(0);
  const dragStartYRef = useRef(0);
  const currentDragDistanceRef = useRef(DEFAULT_DISTANCE); // Track distance during drag

  // Track current zoom distance
  const [currentDistance, setCurrentDistance] = useState(DEFAULT_DISTANCE);
  const [isDragging, setIsDragging] = useState(false);

  // Unique identifier for debugging
  const instanceId = useRef(Math.random().toString(36).substr(2, 9));
  
  // Sync with camera position when model loads or camera changes
  useEffect(() => {
    if (!cameraRef?.current) return;
    
    const syncCameraDistance = () => {
      const camera = cameraRef.current;
      if (!camera) return;
      
      const cameraDistance = camera.position.distanceTo(ZOOM_TARGET);
      
      // Only sync if camera is at a reasonable distance (not during intro animation)
      if (cameraDistance >= MIN_DISTANCE && cameraDistance <= MAX_DISTANCE) {
        // Calculate the horizontal radius from camera position
        // Camera position: (x, y, z) where x = radius * cos(45°), z = radius * sin(45°)
        // So: radius = sqrt(x^2 + z^2)
        const horizontalRadius = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2);
        
        // Update current distance to match camera
        if (Math.abs(currentDistance - horizontalRadius) > 0.1) {
          currentDragDistanceRef.current = horizontalRadius;
          setCurrentDistance(horizontalRadius);
          console.log(`🔍 [ZoomControl3D] Synced distance from camera: ${horizontalRadius.toFixed(2)}`);
        }
      }
    };
    
    // Sync immediately
    syncCameraDistance();
    
    // Listen for model load events to sync camera position
    const handleModelLoad = () => {
      // Small delay to ensure camera position is updated
      setTimeout(syncCameraDistance, 100);
    };
    
    window.addEventListener('load-uploaded-model', handleModelLoad);
    
    return () => {
      window.removeEventListener('load-uploaded-model', handleModelLoad);
    };
  }, [cameraRef, currentDistance, MIN_DISTANCE, MAX_DISTANCE, ZOOM_TARGET]);

  // Debug component lifecycle
  useEffect(() => {
    console.log(`🔍 [ZoomControl3D-${instanceId.current}] Component mounted`);
    
    return () => {
      console.log(`🛑 [ZoomControl3D-${instanceId.current}] Component unmounted`);
    };
  }, []);

  /**
   * Calculate camera position to zoom to world origin (0,0,0)
   * Uses the same calculation as default orbital camera (45° at radius 50, height 25)
   * This matches INTRO_END_POS = (35.36, 25, 35.36) from SceneEditor.tsx
   * Calculation: x = radius * cos(45°), y = height, z = radius * sin(45°)
   */
  const calculateZoomPosition = useCallback((distance: number): THREE.Vector3 => {
    // Use the same angle as default orbital camera: 45 degrees in XY plane
    // This matches: ORBITAL_RADIUS * cos(45°) = 50 * 0.7071 = 35.36
    const angle = Math.PI / 4; // 45 degrees in radians
    
    // Clamp distance to valid range (this is the horizontal radius, like ORBITAL_RADIUS)
    const clampedDistance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, distance));
    
    // Calculate position exactly like orbital camera: horizontal radius with fixed height
    // Match orbital camera calculation: x = radius * cos(angle), y = height, z = radius * sin(angle)
    // Scale height proportionally to maintain the same viewing angle
    const height = DEFAULT_ORBITAL_HEIGHT * (clampedDistance / DEFAULT_DISTANCE);
    
    const x = clampedDistance * Math.cos(angle);
    const y = height;
    const z = clampedDistance * Math.sin(angle);
    
    return new THREE.Vector3(x, y, z);
  }, []);

  /**
   * Animate camera to a specific distance from origin
   */
  const animateToDistance = useCallback((targetDistance: number, immediate: boolean = false) => {
    if (!cameraRef?.current || !sceneRef?.current || !rendererRef?.current) {
      return;
    }

    const camera = cameraRef.current;
    const targetPos = calculateZoomPosition(targetDistance);
    const clampedDistance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, targetDistance));

    if (immediate) {
      // Immediate update for smooth dragging
      camera.position.copy(targetPos);
      camera.lookAt(ZOOM_TARGET);
      if (rendererRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, camera);
      }
      setCurrentDistance(clampedDistance);
    } else {
      // Smooth animation
      if (isZoomingRef.current) {
        // Kill any ongoing zoom animation
        gsap.killTweensOf(camera.position);
      }

      isZoomingRef.current = true;

      gsap.to(camera.position, {
        x: targetPos.x,
        y: targetPos.y,
        z: targetPos.z,
        duration: ZOOM_DURATION,
        ease: 'power2.out',
        onUpdate: () => {
          if (camera && rendererRef.current && sceneRef.current) {
            camera.lookAt(ZOOM_TARGET);
            rendererRef.current.render(sceneRef.current, camera);
            
            // Update current distance based on camera position
            const currentDist = camera.position.distanceTo(ZOOM_TARGET);
            setCurrentDistance(currentDist);
          }
        },
        onComplete: () => {
          isZoomingRef.current = false;
          setCurrentDistance(clampedDistance);
          
          // Final render
          if (camera && rendererRef.current && sceneRef.current) {
            camera.lookAt(ZOOM_TARGET);
            rendererRef.current.render(sceneRef.current, camera);
          }
        },
      });
    }
  }, [cameraRef, sceneRef, rendererRef, calculateZoomPosition]);

  /**
   * Get current camera distance from origin
   */
  const getCurrentDistance = useCallback((): number => {
    if (!cameraRef?.current) {
      return DEFAULT_DISTANCE;
    }
    return cameraRef.current.position.distanceTo(ZOOM_TARGET);
  }, [cameraRef]);

  /**
   * Handle mouse move during drag
   */
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDraggingRef.current || !cameraRef?.current || !sceneRef?.current || !rendererRef?.current) {
      return;
    }

    const deltaY = lastDragYRef.current - event.clientY; // Inverted: drag up = positive = zoom in
    const distanceDelta = deltaY * DRAG_SENSITIVITY;
    
    // Calculate new distance (drag up = zoom in = decrease distance)
    const newDistance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, currentDragDistanceRef.current - distanceDelta));
    
    // Update camera position immediately for smooth dragging
    animateToDistance(newDistance, true);
    
    // Update tracked distance
    currentDragDistanceRef.current = newDistance;
    setCurrentDistance(newDistance);
    
    lastDragYRef.current = event.clientY;
  }, [cameraRef, sceneRef, rendererRef, animateToDistance]);

  /**
   * Handle mouse up - end drag
   */
  const handleMouseUp = useCallback(() => {
    if (!isDraggingRef.current) {
      return;
    }

    const dragDistance = Math.abs(dragStartYRef.current - lastDragYRef.current);
    const finalDistance = getCurrentDistance();
    console.log(`🔍 [ZoomControl3D-${instanceId.current}] Ended drag, distance: ${dragDistance.toFixed(0)}px, final distance: ${finalDistance.toFixed(2)}`);

    isDraggingRef.current = false;
    setIsDragging(false);
    lastDragYRef.current = 0;
    dragStartYRef.current = 0;

    // Remove global mouse event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [getCurrentDistance, handleMouseMove]);

  /**
   * Handle mouse down on button - start drag
   */
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (isDraggingRef.current || !cameraRef?.current) {
      return;
    }

    isDraggingRef.current = true;
    setIsDragging(true);
    lastDragYRef.current = event.clientY;
    dragStartYRef.current = event.clientY;
    
    // Kill any ongoing zoom animations
    if (cameraRef.current) {
      gsap.killTweensOf(cameraRef.current.position);
    }
    
    // Get initial distance
    const initialDistance = getCurrentDistance();
    currentDragDistanceRef.current = initialDistance;
    setCurrentDistance(initialDistance);

    console.log(`🔍 [ZoomControl3D-${instanceId.current}] Started drag from distance: ${initialDistance.toFixed(2)}`);

    // Add global mouse event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [cameraRef, getCurrentDistance, handleMouseMove, handleMouseUp]);


  return (
    <div 
      ref={containerRef}
      className={`fixed top-[95px] right-0 mr-2 z-[50] ${className}`}
      data-zoom-control
      style={{ pointerEvents: 'auto' }}
    >
      {/* Single Zoom Control Button - Drag up to zoom in, drag down to zoom out */}
      <button
        ref={buttonRef}
        onMouseDown={handleMouseDown}
        className={`
          w-12 h-12 rounded-full
          flex items-center justify-center
          bg-white dark:bg-gray-800
          backdrop-blur-sm
          border border-gray-200 dark:border-gray-700
          shadow-lg
          transition-all duration-200
          hover:bg-gray-50 dark:hover:bg-gray-700
          hover:scale-110
          active:scale-95
          cursor-grab active:cursor-grabbing
          group
          ${isDragging ? 'ring-2 ring-purple-500 dark:ring-purple-400' : ''}
        `}
        title="Drag up to zoom in, drag down to zoom out to Origin (0,0,0)"
      >
        <ZoomIn className={`w-6 h-6 text-foreground/80 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors ${isDragging ? 'text-purple-600 dark:text-purple-400' : ''}`} />
      </button>
      
      {/* Visual indicator for drag direction (shown during drag) */}
      {isDragging && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full mb-1 text-xs text-foreground/60 whitespace-nowrap">
          {currentDistance.toFixed(1)}m
        </div>
      )}
    </div>
  );
}

