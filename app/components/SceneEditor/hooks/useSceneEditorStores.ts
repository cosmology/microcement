import { useEffect, useRef } from 'react'
import { useCameraStore } from '@/lib/stores/cameraStore'
import { useSceneStore } from '@/lib/stores/sceneStore'
import { CameraController } from '../utils/cameraController'
import * as THREE from 'three'

/**
 * Custom hook to manage store subscriptions and sync with Three.js scene
 */
export function useSceneEditorStores(
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>,
  cameraControllerRef: React.MutableRefObject<CameraController | null>,
  sceneRef: React.MutableRefObject<THREE.Scene | null>
) {
  const prevBirdViewRef = useRef<boolean>(false)

  // Subscribe to camera store
  const {
    isBirdView,
    cameraPoints,
    lookAtTargets,
    setCameraPoints,
    setLookAtTargets,
  } = useCameraStore()

  // Subscribe to scene store
  const {
    currentFollowPath,
    setModelLoadingProgress,
    worldRotation,
  } = useSceneStore()

  // Handle bird view changes
  useEffect(() => {
    if (!cameraRef.current || !cameraControllerRef.current) return

    // Only animate if bird view state actually changed
    if (prevBirdViewRef.current !== isBirdView) {
      console.log('🦅 [useSceneEditorStores] Bird view changed:', isBirdView)
      
      if (isBirdView) {
        cameraControllerRef.current.animateToBirdView(() => {
          console.log('🦅 [useSceneEditorStores] Bird view animation complete')
        })
      } else {
        // Animate back to current path position
        if (cameraPoints.length > 0 && lookAtTargets.length > 0) {
          cameraControllerRef.current.animateToPathPosition(
            cameraPoints[0],
            lookAtTargets[0],
            1.5,
            () => {
              console.log('📷 [useSceneEditorStores] Camera view animation complete')
            }
          )
        }
      }
      
      prevBirdViewRef.current = isBirdView
    }
  }, [isBirdView, cameraPoints, lookAtTargets, cameraRef, cameraControllerRef])

  // Sync follow path data to camera store
  useEffect(() => {
    if (currentFollowPath) {
      console.log('🔄 [useSceneEditorStores] Syncing follow path to camera store')
      setCameraPoints(currentFollowPath.camera_points)
      setLookAtTargets(currentFollowPath.look_at_targets)
    }
  }, [currentFollowPath, setCameraPoints, setLookAtTargets])

  // Subscribe to world rotation changes and apply to sceneRef
  useEffect(() => {
    if (sceneRef.current) {
      console.log('🌍 [useSceneEditorStores] Applying world rotation to scene:', worldRotation)
      sceneRef.current.rotation.x = worldRotation.x
      sceneRef.current.rotation.y = worldRotation.y
      sceneRef.current.rotation.z = worldRotation.z
      console.log(`🌍 [useSceneEditorStores] Scene rotated: X=${(worldRotation.x * 180 / Math.PI).toFixed(1)}°, Y=${(worldRotation.y * 180 / Math.PI).toFixed(1)}°, Z=${(worldRotation.z * 180 / Math.PI).toFixed(1)}°`)
    }
  }, [worldRotation, sceneRef])

  return {
    isBirdView,
    cameraPoints,
    lookAtTargets,
    currentFollowPath,
    setModelLoadingProgress,
  }
}

