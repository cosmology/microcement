"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useSceneStore } from '../../lib/stores/sceneStore';

interface RotationControlProps {
  className?: string;
  sceneRef?: React.MutableRefObject<THREE.Scene | undefined>;
}

/**
 * Blender-style 3D viewport gizmo for rotating the world
 * Single icon showing coordinate system (X, Y, Z axes)
 * Drag to rotate the world in circular motion
 */
export default function RotationControl({ 
  className = '',
  sceneRef
}: RotationControlProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scene3DRef = useRef<THREE.Scene | null>(null);
  const camera3DRef = useRef<THREE.OrthographicCamera | null>(null);
  const renderer3DRef = useRef<THREE.WebGLRenderer | null>(null);
  const axesGroupRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Mouse interaction state
  const isDraggingRef = useRef(false);
  const lastMousePositionRef = useRef({ x: 0, y: 0 });
  
  // Get scene store for world rotation state
  const { worldRotation, updateWorldRotation } = useSceneStore();
  
  // 3D rotation state using useRef to prevent reset issues
  const xRotationRef = useRef(0);
  const yRotationRef = useRef(0);
  const zRotationRef = useRef(0);
  
  // Display state for UI updates - sync with store
  const [displayRotation, setDisplayRotation] = useState(worldRotation);
  
  // Sync local refs with store values
  useEffect(() => {
    xRotationRef.current = worldRotation.x;
    yRotationRef.current = worldRotation.y;
    zRotationRef.current = worldRotation.z;
    setDisplayRotation(worldRotation);
  }, [worldRotation]);
  
  // Unique identifier for debugging
  const instanceId = useRef(Math.random().toString(36).substr(2, 9));
  
  // Track drag state and hover state for showing/hiding coordinates tooltip
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  
  // Initialize 3D scene for gizmo visualization
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const size = 48; // Size of the gizmo in pixels (w-12 h-12 = 48px to match button size)
    
    // Create mini 3D scene
    const scene = new THREE.Scene();
    
    // Use OrthographicCamera for more subtle, grid-like appearance
    const camera = new THREE.OrthographicCamera(-size/2, size/2, size/2, -size/2, 0.1, 100);
    
    // Position camera to look at the gizmo from a 45-degree angle (like Blender)
    // Camera distance for proper scaling
    const cameraDistance = 100;
    const angle = Math.PI / 4; // 45 degrees
    const elevation = Math.PI / 6; // ~30 degrees elevation
    camera.position.set(
      cameraDistance * Math.cos(elevation) * Math.cos(angle),
      cameraDistance * Math.sin(elevation),
      cameraDistance * Math.cos(elevation) * Math.sin(angle)
    );
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    
    // Create coordinate system axes (X=red, Y=green, Z=blue)
    // Use line-based geometry for subtle look, similar to main world grid gizmo
    const axesGroup = new THREE.Group();
    const axisLength = size * 0.4; // Relative to canvas size for scalability
    
    // X-axis (red) - pointing right - using LineSegments for subtle appearance
    const xAxisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(axisLength, 0, 0)
    ]);
    const xAxisMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 });
    const xAxis = new THREE.Line(xAxisGeometry, xAxisMaterial);
    axesGroup.add(xAxis);
    
    // X-axis label - simple plane with text texture for subtle appearance
    const xLabelGeometry = new THREE.PlaneGeometry(8, 8);
    const xLabelMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.9 });
    const xLabelCanvas = document.createElement('canvas');
    xLabelCanvas.width = 64;
    xLabelCanvas.height = 64;
    const xLabelCtx = xLabelCanvas.getContext('2d');
    if (xLabelCtx) {
      xLabelCtx.fillStyle = '#ff0000';
      xLabelCtx.font = 'bold 48px Arial';
      xLabelCtx.textAlign = 'center';
      xLabelCtx.textBaseline = 'middle';
      xLabelCtx.fillText('X', 32, 32);
      xLabelMaterial.map = new THREE.CanvasTexture(xLabelCanvas);
    }
    const xLabel = new THREE.Mesh(xLabelGeometry, xLabelMaterial);
    xLabel.position.set(axisLength * 1.2, 0, 0);
    axesGroup.add(xLabel);
    
    // Y-axis (green) - pointing up - using LineSegments for subtle appearance
    const yAxisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, axisLength, 0)
    ]);
    const yAxisMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
    const yAxis = new THREE.Line(yAxisGeometry, yAxisMaterial);
    axesGroup.add(yAxis);
    
    // Y-axis label - simple plane with text texture for subtle appearance
    const yLabelGeometry = new THREE.PlaneGeometry(8, 8);
    const yLabelMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.9 });
    const yLabelCanvas = document.createElement('canvas');
    yLabelCanvas.width = 64;
    yLabelCanvas.height = 64;
    const yLabelCtx = yLabelCanvas.getContext('2d');
    if (yLabelCtx) {
      yLabelCtx.fillStyle = '#00ff00';
      yLabelCtx.font = 'bold 48px Arial';
      yLabelCtx.textAlign = 'center';
      yLabelCtx.textBaseline = 'middle';
      yLabelCtx.fillText('Y', 32, 32);
      yLabelMaterial.map = new THREE.CanvasTexture(yLabelCanvas);
    }
    const yLabel = new THREE.Mesh(yLabelGeometry, yLabelMaterial);
    yLabel.position.set(0, axisLength * 1.2, 0);
    axesGroup.add(yLabel);
    
    // Z-axis (blue) - pointing forward - using LineSegments for subtle appearance
    const zAxisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, axisLength)
    ]);
    const zAxisMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 2 });
    const zAxis = new THREE.Line(zAxisGeometry, zAxisMaterial);
    axesGroup.add(zAxis);
    
    // Z-axis label - simple plane with text texture for subtle appearance
    const zLabelGeometry = new THREE.PlaneGeometry(8, 8);
    const zLabelMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.9 });
    const zLabelCanvas = document.createElement('canvas');
    zLabelCanvas.width = 64;
    zLabelCanvas.height = 64;
    const zLabelCtx = zLabelCanvas.getContext('2d');
    if (zLabelCtx) {
      zLabelCtx.fillStyle = '#0000ff';
      zLabelCtx.font = 'bold 48px Arial';
      zLabelCtx.textAlign = 'center';
      zLabelCtx.textBaseline = 'middle';
      zLabelCtx.fillText('Z', 32, 32);
      zLabelMaterial.map = new THREE.CanvasTexture(zLabelCanvas);
    }
    const zLabel = new THREE.Mesh(zLabelGeometry, zLabelMaterial);
    zLabel.position.set(0, 0, axisLength * 1.2);
    axesGroup.add(zLabel);
    
    scene.add(axesGroup);
    
    // Create renderer with explicit context attributes to avoid conflicts
    const renderer = new THREE.WebGLRenderer({ 
      canvas, 
      alpha: true, 
      antialias: true,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance'
    });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
    renderer.setClearColor(0x000000, 0); // Transparent background
    
    // Store refs
    scene3DRef.current = scene;
    camera3DRef.current = camera;
    renderer3DRef.current = renderer;
    axesGroupRef.current = axesGroup;
    
    // Update gizmo rotation to match world rotation
    const updateGizmoRotation = () => {
      if (axesGroupRef.current) {
        axesGroupRef.current.rotation.set(
          displayRotation.x,
          displayRotation.y,
          displayRotation.z
        );
      }
    };
    
    // Ensure materials are compiled and scene is ready
    // Use renderer.compile() to pre-compile shaders before first render
    try {
      // Pre-compile all shaders to avoid WebGL program errors
      renderer.compile(scene, camera);
    } catch (compileError) {
      console.warn('🎯 [RotationControl] Material compilation warning:', compileError);
      // Continue anyway - some browsers may not support compile()
    }
    
    // Animation loop
    let frameCount = 0;
    const animate = () => {
      if (!renderer || !scene || !camera || !axesGroupRef.current) {
        return;
      }
      
      // Skip first frame to allow WebGL context to stabilize
      if (frameCount < 1) {
        frameCount++;
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      
      try {
        updateGizmoRotation();
        renderer.render(scene, camera);
      } catch (error) {
        console.error('🎯 [RotationControl] Render error:', error);
        // Stop animation on error to prevent spam
        return;
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation after a small delay to ensure WebGL context is ready
    const startId = setTimeout(() => {
      animationFrameRef.current = requestAnimationFrame(animate);
    }, 50); // Small delay to ensure canvas is ready
    
    return () => {
      // Cancel any pending timeouts
      clearTimeout(startId);
      
      // Cancel animation frame
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Cleanup renderer and resources
      if (renderer) {
        renderer.dispose();
      }
      
      // Dispose geometries and materials
      if (axesGroupRef.current) {
        axesGroupRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(mat => mat.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
      }
    };
  }, [displayRotation]);
  
  // Mouse interaction handlers
  // Order: handleMouseMove first (no dependencies), then handleMouseUp, then handleMouseDown
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDraggingRef.current) return;
    
    const deltaX = event.clientX - lastMousePositionRef.current.x;
    const deltaY = event.clientY - lastMousePositionRef.current.y;
    
    // Convert mouse movement to rotation (circular motion)
    // This mimics Blender's viewport rotation behavior
    const sensitivity = 0.01;
    
    // Horizontal drag rotates around Y-axis (yaw)
    const yawDelta = deltaX * sensitivity;
    
    // Vertical drag rotates around X-axis (pitch)
    const pitchDelta = -deltaY * sensitivity;
    
    // Update world rotation using refs for current values
    const newX = xRotationRef.current + pitchDelta;
    const newY = yRotationRef.current + yawDelta;
    const newZ = zRotationRef.current; // Keep Z rotation (roll) unchanged for now
    
    // Update refs
    xRotationRef.current = newX;
    yRotationRef.current = newY;
    zRotationRef.current = newZ;
    
    // Update store
    updateWorldRotation('x', newX);
    updateWorldRotation('y', newY);
    
    console.log(`🎯 [RotationControl-${instanceId.current}] Rotation updated: X=${(newX * 180 / Math.PI).toFixed(1)}°, Y=${(newY * 180 / Math.PI).toFixed(1)}°`);
    
    lastMousePositionRef.current = { x: event.clientX, y: event.clientY };
  }, [updateWorldRotation]);
  
  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current) {
      console.log(`🎯 [RotationControl-${instanceId.current}] Stopped dragging`);
    }
    
    isDraggingRef.current = false;
    setIsDragging(false);
    lastMousePositionRef.current = { x: 0, y: 0 };
    
    // Remove global mouse event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (isDraggingRef.current) return;
    
    isDraggingRef.current = true;
    setIsDragging(true);
    lastMousePositionRef.current = { x: event.clientX, y: event.clientY };
    
    console.log(`🎯 [RotationControl-${instanceId.current}] Started dragging`);
    
    // Add global mouse event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove, handleMouseUp]);
  
  // Debug component lifecycle
  useEffect(() => {
    console.log(`🎯 [RotationControl-${instanceId.current}] Component mounted`);
    
    return () => {
      console.log(`🛑 [RotationControl-${instanceId.current}] Component unmounted`);
    };
  }, []);
  
  return (
    <div 
      ref={containerRef}
      className={`fixed top-[160px] right-0 mr-2 z-[50]`}
      data-rotation-control-new
      style={{ pointerEvents: 'auto' }}
    >
      {/* Blender-style 3D Gizmo - Same size as ZoomControl3D */}
      <div
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
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
          relative
          ${isDragging ? 'ring-2 ring-purple-500 dark:ring-purple-400' : ''}
        `}
        title="Drag to rotate world view (Blender-style)"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full rounded-full p-1"
          style={{ pointerEvents: 'none', display: 'block' }}
        />
      </div>
      
      {/* Rotation Values Display - Show under button (on hover or drag) */}
      {(isDragging || isHovering) && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 pointer-events-none z-10">
          <div className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded backdrop-blur-sm shadow-lg">
            <div className="text-xs text-gray-900 dark:text-gray-300 flex flex-col items-center space-y-0.5">
              <div>X: {(displayRotation.x * 180 / Math.PI).toFixed(1)}°</div>
              <div>Y: {(displayRotation.y * 180 / Math.PI).toFixed(1)}°</div>
              <div>Z: {(displayRotation.z * 180 / Math.PI).toFixed(1)}°</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
