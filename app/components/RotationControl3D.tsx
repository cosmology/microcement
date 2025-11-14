"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { useCameraStore } from '../../lib/stores/cameraStore';
import { useSceneStore } from '../../lib/stores/sceneStore';
import * as THREE from 'three';

interface RotationControl3DProps {
  className?: string;
  sceneRef?: React.MutableRefObject<THREE.Scene | undefined>;
}

export default function RotationControl3D({ 
  className = '',
  sceneRef: worldSceneRef
}: RotationControl3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Mouse interaction state
  const isDraggingRef = useRef(false);
  const lastMousePositionRef = useRef({ x: 0, y: 0 });
  const currentAxisRef = useRef<string | null>(null);

  // Get camera store for X-axis rotation control
  const { setOrbitalHeight, orbitalHeight } = useCameraStore();
  
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
  
  // Unique identifier for debugging multiple instances
  const instanceId = useRef(Math.random().toString(36).substr(2, 9));
  
  // Flag to prevent multiple instances from controlling the world scene
  const [isActiveInstance, setIsActiveInstance] = useState(true); // Always active with store pattern
  
  // Track which axis is currently being dragged
  const [draggingAxis, setDraggingAxis] = useState<string | null>(null);
  
  // Debug component lifecycle - only log on mount/unmount
  useEffect(() => {
    console.log(`🚀 [RotationControl3D-${instanceId.current}] Component mounted with store pattern`);
    console.log(`🔗 [RotationControl3D-${instanceId.current}] Using sceneStore for world rotation state`);
    
    return () => {
      console.log(`🛑 [RotationControl3D-${instanceId.current}] Component unmounted`);
    };
  }, []);

  // Track rotation value changes
  useEffect(() => {
    console.log(`📊 [RotationControl3D-${instanceId.current}] X: ${xRotationRef.current.toFixed(3)}, Y: ${yRotationRef.current.toFixed(3)}, Z: ${zRotationRef.current.toFixed(3)}`);
  }, [displayRotation]);


  // Mouse interaction handlers for tracking ball
  const handleMouseDown = useCallback((event: React.MouseEvent, axis: string) => {
    isDraggingRef.current = true;
    currentAxisRef.current = axis;
    setDraggingAxis(axis);
    lastMousePositionRef.current = { x: event.clientX, y: event.clientY };
    
    console.log(`🖱️ [RotationControl3D-${instanceId.current}] Started ${axis.toUpperCase()}-axis dragging`);
    
    // Add global mouse event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDraggingRef.current || !currentAxisRef.current) return;
    
    const deltaX = event.clientX - lastMousePositionRef.current.x;
    const deltaY = event.clientY - lastMousePositionRef.current.y;
    
    const sensitivity = 0.01; // Adjust sensitivity as needed
    const rotationDelta = (deltaX + deltaY) * sensitivity;
    
    const currentAxis = currentAxisRef.current;
    
    // Update rotation based on the dragged axis
    let newRotation = 0;
    if (currentAxis === 'x') {
      newRotation = xRotationRef.current + rotationDelta;
      xRotationRef.current = newRotation;
      console.log(`🔄 [X] ${xRotationRef.current.toFixed(3)} → ${newRotation.toFixed(3)} (Δ: ${rotationDelta.toFixed(3)})`);
    } else if (currentAxis === 'y') {
      newRotation = yRotationRef.current + rotationDelta;
      yRotationRef.current = newRotation;
      console.log(`🔄 [Y] ${yRotationRef.current.toFixed(3)} → ${newRotation.toFixed(3)} (Δ: ${rotationDelta.toFixed(3)})`);
    } else if (currentAxis === 'z') {
      newRotation = zRotationRef.current + rotationDelta;
      zRotationRef.current = newRotation;
      console.log(`🔄 [Z] ${zRotationRef.current.toFixed(3)} → ${newRotation.toFixed(3)} (Δ: ${rotationDelta.toFixed(3)})`);
    }
    
    // Update the store with the new rotation value
    updateWorldRotation(currentAxis as 'x' | 'y' | 'z', newRotation);
    console.log(`🟢 [${currentAxis.toUpperCase()}] ${(newRotation * 180 / Math.PI).toFixed(1)}° - Updated sceneStore`);
    
    lastMousePositionRef.current = { x: event.clientX, y: event.clientY };
  }, [updateWorldRotation]);

  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current) {
      console.log(`🖱️ [RotationControl3D-${instanceId.current}] Stopped ${currentAxisRef.current?.toUpperCase()}-axis dragging`);
    }
    
    isDraggingRef.current = false;
    currentAxisRef.current = null;
    setDraggingAxis(null);
    
    // Remove global mouse event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);


  return (
    <div className={`fixed top-0 right-0 mt-2 mr-2 z-[50] ${className}`} data-rotation-control>
      {/* Tracking Ball Control */}
      <div 
        ref={containerRef}
        className="relative w-28 h-28 mb-2"
      >
        {/* Central tracking ball */}
        <div 
          className="absolute inset-0 rounded-full bg-white/5 dark:bg-black/50 backdrop-blur-sm border-2 border-gray-300 dark:border-gray-600 shadow-lg transition-transform duration-100"
          style={{
            transform: `rotateX(${displayRotation.x * 180 / Math.PI}deg) rotateY(${displayRotation.y * 180 / Math.PI}deg) rotateZ(${displayRotation.z * 180 / Math.PI}deg)`
          }}
        >
          {/* Grid pattern */}
          <div className="absolute inset-2 rounded-full border border-gray-200 dark:border-gray-200 opacity-30">
            <div className="absolute inset-0 rounded-full border border-gray-200 dark:border-gray-200 opacity-20" style={{ margin: '20%' }}></div>
          </div>
        </div>
        
        {/* X-Axis Controls */}
        <button
          className={`absolute top-2 left-1/2 transform -translate-x-1/2 w-5 h-5 rounded-full text-foreground/80 text-xs font-bold shadow-lg transition-all cursor-grab active:cursor-grabbing ${
            draggingAxis === 'x' ? 'bg-red-300 scale-110' : 'bg-red-500 hover:bg-red-400'
          }`}
          onMouseDown={(e) => handleMouseDown(e, 'x')}
          title="X-Axis Rotation"
        >
          +X
        </button>
        <button
          className={`absolute bottom-2 left-1/2 transform -translate-x-1/2 w-5 h-5 rounded-full text-foreground/80 text-xs font-bold shadow-lg transition-all cursor-grab active:cursor-grabbing ${
            draggingAxis === 'x' ? 'bg-red-400 scale-110' : 'bg-red-600 hover:bg-red-500'
          }`}
          onMouseDown={(e) => handleMouseDown(e, 'x')}
          title="X-Axis Rotation (Negative)"
        >
          -X
        </button>
        
        {/* Y-Axis Controls */}
        <button
          className={`absolute left-2 top-1/2 transform -translate-y-1/2 w-5 h-5 rounded-full text-foreground/80 text-xs font-bold shadow-lg transition-all cursor-grab active:cursor-grabbing ${
            draggingAxis === 'y' ? 'bg-green-300 scale-110' : 'bg-green-500 hover:bg-green-400'
          }`}
          onMouseDown={(e) => handleMouseDown(e, 'y')}
          title="Y-Axis Rotation"
        >
          +Y
        </button>
        <button
          className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-5 h-5 rounded-full text-foreground/80 text-xs font-bold shadow-lg transition-all cursor-grab active:cursor-grabbing ${
            draggingAxis === 'y' ? 'bg-green-400 scale-110' : 'bg-green-600 hover:bg-green-500'
          }`}
          onMouseDown={(e) => handleMouseDown(e, 'y')}
          title="Y-Axis Rotation (Negative)"
        >
          -Y
        </button>
        
        {/* Z-Axis Controls */}
        <button
          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full text-foreground/80 text-xs font-bold shadow-lg transition-all cursor-grab active:cursor-grabbing ${
            draggingAxis === 'z' ? 'bg-blue-300 scale-110' : 'bg-blue-500 hover:bg-blue-400'
          }`}
          onMouseDown={(e) => handleMouseDown(e, 'z')}
          title="Z-Axis Rotation"
          style={{ marginTop: '-14px' }}
        >
          +Z
        </button>
        <button
          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full text-foreground/80 text-xs font-bold shadow-lg transition-all cursor-grab active:cursor-grabbing ${
            draggingAxis === 'z' ? 'bg-blue-400 scale-110' : 'bg-blue-600 hover:bg-blue-500'
          }`}
          onMouseDown={(e) => handleMouseDown(e, 'z')}
          title="Z-Axis Rotation (Negative)"
          style={{ marginTop: '14px' }}
        >
          -Z
        </button>
      </div>
      
      {/* Rotation Values Display - Positioned below the sphere */}
      <div className="flex justify-center pointer-events-none">
        <div className="text-xs bg-white/5 dark:bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
          <div className="text-xs text-foreground/80 whitespace-nowrap">
            X: {(displayRotation.x * 180 / Math.PI).toFixed(1)}° | 
            Y: {(displayRotation.y * 180 / Math.PI).toFixed(1)}° | 
            Z: {(displayRotation.z * 180 / Math.PI).toFixed(1)}°
          </div>
        </div>
      </div>
    </div>
  );
}