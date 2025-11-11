"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import SwiperGallery, { GalleryImage } from './SwiperGallery';
import LoaderOverlay from './LoaderOverlay';
import { isMobile, getThemeColors, cssColorToHex } from '../../lib/utils';
import { ModelLoader, SCENE_CONFIG, getCameraPathData, getHotspotSettings, getUserSceneConfig } from '@/lib/services';
import { SceneConfigService } from '@/lib/services/SceneConfigService';
import { useCameraStore } from '@/lib/stores/cameraStore';
import { DEFAULT_ORBITAL_CONFIG } from '@/lib/config/defaultOrbitalPath';
import { useSceneStore } from '@/lib/stores/sceneStore';
import { createRoomMeasurements, RoomPlanMetadata } from './RoomMeasurementsOverlay';


interface ScrollSceneProps {
  sceneStage?: number;
  currentSection?: string;
  onIntroComplete?: () => void;
  onIntroStart?: () => void;
  onDebugUpdate?: (data: any) => void;
  user?: any;
  userRole?: 'admin' | 'architect' | 'end_user' | 'guest';
}

const isSceneDisabledGlobally = () => {
  if (process.env.NEXT_PUBLIC_DISABLE_SCENE === '1') {
    return true;
  }
  if (typeof window !== 'undefined' && (window as any).__DISABLE_SCENE__ === true) {
    return true;
  }
  return false;
};

export default function SceneEditor({ 
  sceneStage = 0, 
  currentSection = 'hero',
  onIntroComplete,
  onIntroStart,
  onDebugUpdate,
  user,
  userRole  // Get role from props instead of calling useUserRole again
}: ScrollSceneProps) {
  const authRole = userRole || 'guest';
  const authUser = user;
  
  if (isSceneDisabledGlobally()) {
    console.log('🚫 [SceneEditor] SceneEditor is globally disabled. Not rendering.');
    return null;
  }
  
  // Subscribe to Zustand stores
  const {
    cameraType: storeCameraType,
    orbitalHeight: storeOrbitalHeight,
    isBirdView: storeBirdView,
    isBirdViewLocked: storeBirdViewLocked,
    isEditorEnabled: storeEditorEnabled,
    showLookAtTargets: storeShowLookAtTargets,
    selectedHeightIndex: storeSelectedHeightIndex,
    cameraPoints: storeCameraPoints,
    lookAtTargets: storeLookAtTargets,
    clearSceneRequested,
    rotateModelRequested,
    rotationAngle,
    setIsBirdView: setStoreBirdView,
    setCameraPoints: setStoreCameraPoints,
    setLookAtTargets: setStoreLookAtTargets,
    setCameraRef: setStoreCameraRef,
    setRendererRef: setStoreRendererRef,
    setSceneRef: setStoreSceneRef,
    clearClearSceneRequest,
    clearRotateModelRequest,
  } = useCameraStore()
  
  const {
    showMeasurements,
    roomPlanJsonPath,
    roomPlanMetadata,
    setRoomPlanMetadata,
    modelPath,
    setModelPath,
  } = useSceneStore((state) => ({
    showMeasurements: state.showMeasurements,
    roomPlanJsonPath: state.roomPlanJsonPath,
    roomPlanMetadata: state.roomPlanMetadata,
    setRoomPlanMetadata: state.setRoomPlanMetadata,
    modelPath: state.modelPath,
    setModelPath: state.setModelPath,
  }));
  
  const [hasUserConfig, setHasUserConfig] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [userSceneConfig, setUserSceneConfig] = useState<any>(null);
  
  // Store original architect path for toggling
  const originalArchitectPathRef = useRef<{
    cameraPoints: Array<{x: number, y: number, z: number}>,
    lookAtTargets: Array<{x: number, y: number, z: number}>
  } | null>(null);
  
  // Use store state instead of local state
  const [isBirdView, setIsBirdView] = useState(storeBirdView);
  const isBirdViewRef = useRef(storeBirdView);
  const [isEditorEnabled, setIsEditorEnabled] = useState(storeEditorEnabled);
  const [wasBirdViewActiveBeforeScroll, setWasBirdViewActiveBeforeScroll] = useState(false);
  const [isManualEditMode, setIsManualEditMode] = useState(false); // Track manual editing
  
  const measurementGroupRef = useRef<THREE.Group | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  
  // Watch camera type and orbital height - swap waypoint data
  useEffect(() => {
    if (storeCameraType === 'orbital') {
      console.log('🌀 [Camera Type] → ORBITAL - Loading circular waypoints at height:', storeOrbitalHeight);
      
      // Generate circular waypoints at current orbital height
      const circularWaypoints = DEFAULT_ORBITAL_CONFIG.CAMERA_POINTS.map((p: any) => ({
        x: p.x,
        y: storeOrbitalHeight,  // Use height from slider
        z: p.z
      }));
      
      setStoreCameraPoints(circularWaypoints);
      setStoreLookAtTargets(DEFAULT_ORBITAL_CONFIG.LOOK_AT_TARGETS);
      console.log('🌀 [Camera Type] Loaded', DEFAULT_ORBITAL_CONFIG.WAYPOINT_COUNT, 'circular waypoints at height', storeOrbitalHeight);
      
      // Regenerate curve with new circular waypoints
      // Note: gsapCameraPoints is a const derived from store, it will update on next render
      const newPoints = circularWaypoints.map((p: any) => new THREE.Vector3(p.x, p.y, p.z));
      const newLookAtPoints = DEFAULT_ORBITAL_CONFIG.LOOK_AT_TARGETS.map((p: any) => new THREE.Vector3(p.x, p.y, p.z));
      
      gsapLookAtTargetsRef.current = newLookAtPoints;
      const newCurve = new THREE.CatmullRomCurve3(newPoints, false, 'catmullrom', 0.1);
      gsapCurveRef.current = newCurve;
      gsapLookCurveRef.current = new THREE.CatmullRomCurve3(newLookAtPoints, false, 'catmullrom', 0.1);
      
      // Update path visuals in 3D scene
      console.log('🎨 [Camera Type → Orbital] Updating path visuals with circular path');
      addPathVisuals(newCurve);
      
      // Force immediate camera update in 3D scene
      if (cameraRef.current && rendererRef.current && sceneRef.current) {
        const firstPoint = new THREE.Vector3(circularWaypoints[0].x, circularWaypoints[0].y, circularWaypoints[0].z);
        cameraRef.current.position.copy(firstPoint);
        cameraRef.current.lookAt(0, 10, 0);
        cameraRef.current.updateMatrixWorld();
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        console.log('🌀 [Camera Type] Scene camera updated to first orbital waypoint');
      }
    } else if (storeCameraType === 'path' && originalArchitectPathRef.current) {
      console.log('📍 [Camera Type] → PATH - Restoring architect waypoints');
      setStoreCameraPoints(originalArchitectPathRef.current.cameraPoints);
      setStoreLookAtTargets(originalArchitectPathRef.current.lookAtTargets);
      console.log('📍 [Camera Type] Restored', originalArchitectPathRef.current.cameraPoints.length, 'custom waypoints');
      
      // Regenerate curve with architect's custom waypoints
      // Note: gsapCameraPoints is a const derived from store, it will update on next render
      const newPoints = originalArchitectPathRef.current.cameraPoints.map((p: any) => new THREE.Vector3(p.x, p.y, p.z));
      const newLookAtPoints = originalArchitectPathRef.current.lookAtTargets.map((p: any) => new THREE.Vector3(p.x, p.y, p.z));
      
      gsapLookAtTargetsRef.current = newLookAtPoints;
      const newCurve = new THREE.CatmullRomCurve3(newPoints, false, 'catmullrom', 0.1);
      gsapCurveRef.current = newCurve;
      gsapLookCurveRef.current = new THREE.CatmullRomCurve3(newLookAtPoints, false, 'catmullrom', 0.1);
      
      // Update path visuals in 3D scene
      console.log('🎨 [Camera Type → Path] Updating path visuals with custom path');
      addPathVisuals(newCurve);
      
      // Force immediate camera update in 3D scene
      if (cameraRef.current && rendererRef.current && sceneRef.current && originalArchitectPathRef.current.cameraPoints.length > 0) {
        const firstPoint = originalArchitectPathRef.current.cameraPoints[0];
        const firstLookAt = originalArchitectPathRef.current.lookAtTargets[0];
        cameraRef.current.position.set(firstPoint.x, firstPoint.y, firstPoint.z);
        cameraRef.current.lookAt(firstLookAt.x, firstLookAt.y, firstLookAt.z);
        cameraRef.current.updateMatrixWorld();
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        console.log('📍 [Camera Type] Scene camera updated to first custom waypoint');
      }
    }
  }, [storeCameraType, storeOrbitalHeight, setStoreCameraPoints, setStoreLookAtTargets]);
  
  // Sync bird view from store and trigger animation
  useEffect(() => {
    console.log('🎯 [SceneEditor] Store bird view changed to:', storeBirdView, 'current local:', isBirdView)
    
    // Only trigger animation if state actually changed
    if (storeBirdView !== isBirdView) {
      console.log('🎯 [SceneEditor] Bird view state mismatch - triggering animation')
      
      // Check if locked
      if (!storeBirdView && storeBirdViewLocked) {
        console.log('🔒 [SceneEditor] Bird view is locked - ignoring switch to camera view');
        return;
      }
      
      if (storeBirdView) {
        // Going TO bird view - trigger animation
        console.log('🎯 [SceneEditor] Animating TO bird view');
        animateToBirdView()
      } else {
        // Going FROM bird view - trigger return animation  
        console.log('🎯 [SceneEditor] Animating FROM bird view to camera path');
        animateFromBirdView()
      }
    }
  }, [storeBirdView])
  
  // Sync editor state from store
  useEffect(() => {
    console.log('✏️ [SceneEditor] Store editor enabled changed to:', storeEditorEnabled, 'current local:', isEditorEnabled)
    if (storeEditorEnabled !== isEditorEnabled) {
      setIsEditorEnabled(storeEditorEnabled)
      console.log('✏️ [SceneEditor] Updated local editor state to:', storeEditorEnabled)
      
      // Update window global for backwards compatibility
      ;(window as any).__isEditorEnabled = storeEditorEnabled
    }
  }, [storeEditorEnabled, isEditorEnabled])
  
  // Subscribe to clear scene requests from store
  useEffect(() => {
    if (clearSceneRequested) {
      console.log('🗑️ [SceneEditor] Clear scene requested from store')
      clearCurrentModel()
      
      // Force immediate scene update after clearing
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current)
        console.log('✅ [SceneEditor] Scene rendered after clear')
      }
      
      clearClearSceneRequest()
    }
  }, [clearSceneRequested, clearClearSceneRequest])
  
  // Subscribe to rotate model requests from store
  useEffect(() => {
    if (rotateModelRequested) {
      console.log('🔄 [SceneEditor] Rotate model requested from store, angle:', rotationAngle)
      if (!sceneRef.current) {
        console.warn('🔄 [SceneEditor] Scene not ready')
        clearRotateModelRequest()
        return
      }
      
      // Find the loaded model
      const model = sceneRef.current.getObjectByName('floorPlan')
      if (model) {
        const currentRotation = model.rotation.y
        const targetRotation = currentRotation + rotationAngle
        
        console.log('🔄 [SceneEditor] Animating rotation from', (currentRotation * 180 / Math.PI).toFixed(2), 'to', (targetRotation * 180 / Math.PI).toFixed(2), 'degrees')
        
        // Animate rotation with GSAP
        gsap.to(model.rotation, {
          y: targetRotation,
          duration: 0.5,
          ease: 'power2.inOut',
          onUpdate: () => {
            // Force render during animation
            if (rendererRef.current && cameraRef.current && sceneRef.current) {
              rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
            if (measurementGroupRef.current) {
              measurementGroupRef.current.rotation.y = model.rotation.y;
              measurementGroupRef.current.updateMatrixWorld(true);
            }
          },
          onComplete: () => {
            console.log('🔄 [ZUSTAND] Rotation complete. New rotation Y:', model.rotation.y.toFixed(3), 'radians', '(', (model.rotation.y * 180 / Math.PI).toFixed(2), 'degrees)');
            if (measurementGroupRef.current) {
              measurementGroupRef.current.rotation.y = model.rotation.y;
              measurementGroupRef.current.updateMatrixWorld(true);
            }
            clearRotateModelRequest();
          }
        })
      } else {
        console.warn('🔄 [SceneEditor] No model found to rotate')
        console.log('🔄 [SceneEditor] Scene children:', sceneRef.current.children.map((c: any) => ({ name: c.name, type: c.type })))
        clearRotateModelRequest()
      }
    }
  }, [rotateModelRequested, rotationAngle, clearRotateModelRequest])
  
  const [hotspotSettings, setHotspotSettings] = useState<any>({
    focalDistances: {},
    categories: {},
    colors: { HOVER: 0xb2d926 }
  });
  const [cameraPathData, setCameraPathData] = useState<any>(null);
  
  // Animation functions for bird view
  const animateToBirdView = useCallback(() => {
    console.log('🦅 [SceneEditor] animateToBirdView called')
    if (!cameraRef.current) {
      console.log('❌ [SceneEditor] cameraRef.current is null, cannot animate to bird view')
      return
    }
    
    // Set state immediately
    setIsBirdView(true)
    isBirdViewRef.current = true
    ;(window as any).__isBirdView = true
    ;(window as any).__birdViewPersistent = true
    
    // Save current position for return
    if (introCompletedRef.current) {
      cameraStateRef.current.savedSplineProgress = parseFloat(pathProgressRef.current.t.toFixed(6))
      if (gsapCurveRef.current) {
        const exactSplinePosition = gsapCurveRef.current.getPointAt(cameraStateRef.current.savedSplineProgress)
        cameraStateRef.current.exactSplinePosition = exactSplinePosition.clone()
      } else {
        cameraStateRef.current.exactSplinePosition = cameraRef.current.position.clone()
      }
      
      // Save lookAt target
      const currentLookDir = new THREE.Vector3()
      cameraRef.current.getWorldDirection(currentLookDir)
      const currentLookAtTarget = cameraRef.current.position.clone().add(currentLookDir.multiplyScalar(10))
      cameraStateRef.current.savedLookAtTarget = currentLookAtTarget.clone()
    }
    
    // Animate to bird view position
    console.log('🎯 [SceneEditor] Starting animation to bird view position:', INTRO_START_POS)
    isAnimatingToBirdView.current = true
    isAnimatingRef.current = true
    
    gsap.to(cameraRef.current.position, {
      x: INTRO_START_POS.x,
      y: INTRO_START_POS.y,
      z: INTRO_START_POS.z,
      duration: 1.5,
      ease: "power2.inOut",
      onUpdate: () => {
        if (cameraRef.current && rendererRef.current && sceneRef.current) {
          cameraRef.current.lookAt(0, 0, 0)
          rendererRef.current.render(sceneRef.current, cameraRef.current)
        }
      },
      onComplete: () => {
        console.log('🦅 [SceneEditor] Bird view animation completed')
        isAnimatingToBirdView.current = false
        isAnimatingRef.current = false
        isTestingCameraRef.current = false
        
        // Ensure state is synced
        setIsBirdView(true)
        isBirdViewRef.current = true
        ;(window as any).__isBirdView = true
        
        // Sync to store
        if (storeBirdView !== true) {
          setStoreBirdView(true)
        }
      }
    })
  }, [storeBirdView, setStoreBirdView])  // Refs don't need to be in dependencies
  
  const animateFromBirdView = useCallback(() => {
    console.log('📷 [SceneEditor] animateFromBirdView called')
    if (!cameraRef.current) return
    
    // Resolve target position
    const targetPos = (cameraStateRef.current.exactSplinePosition?.clone())
      || (gsapCurveRef.current ? gsapCurveRef.current.getPointAt(cameraStateRef.current.savedSplineProgress) : null)
      || cameraStateRef.current.mainPathPosition.clone()
    const targetLookAt = (cameraStateRef.current.savedLookAtTarget?.clone()) 
      || (cubePos.current ? cubePos.current.clone() : new THREE.Vector3(0, 0, 0))
    
    console.log('🎯 [SceneEditor] Animating to target position:', targetPos)
    isAnimatingFromBirdView.current = true
    
    gsap.to(cameraRef.current.position, {
      x: targetPos.x,
      y: targetPos.y,
      z: targetPos.z,
      duration: 1.5,
      ease: "power2.inOut",
      onUpdate: () => {
        if (cameraRef.current && rendererRef.current && sceneRef.current) {
          cameraRef.current.lookAt(targetLookAt)
          rendererRef.current.render(sceneRef.current, cameraRef.current)
        }
      },
      onComplete: () => {
        console.log('📷 [SceneEditor] Return to camera path animation completed')
        isAnimatingFromBirdView.current = false
        isTestingCameraRef.current = false
        
        // Update state
        setIsBirdView(false)
        isBirdViewRef.current = false
        ;(window as any).__isBirdView = false
        ;(window as any).__birdViewPersistent = false
        
        // Sync to store
        if (storeBirdView !== false) {
          setStoreBirdView(false)
        }
        
        // Resume camera on path
        if (introCompletedRef.current && !isFocusedOnHotspotRef.current) {
          updateCameraAlongCurve(cameraRef.current!, cameraStateRef.current.savedSplineProgress || pathProgressRef.current.t)
          if (rendererRef.current && sceneRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current!)
          }
        }
        cameraStateRef.current.isOnMainPath = true
      }
    })
  }, [storeBirdView, setStoreBirdView])  // Refs don't need to be in dependencies

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoadingConfig(true);
        
        const userId = user?.id;
        console.log('🔄 Loading scene settings from Supabase...');
        console.log('🔍 ScrollScene: User ID:', userId, 'Role:', authRole);
        
        // CRITICAL: NO auto-load for any logged-in user
        // If userId exists, user is logged in (don't rely on authRole due to race condition)
        // All logged-in users start with blank scene and select models explicitly
        if (userId) {
          console.log('🚫 [SceneEditor] User logged in (ID:', userId, ') - skipping auto-load of settings');
          console.log('🚫 [SceneEditor] Role:', authRole, '- Scene blank until explicit model selection');
          setHasUserConfig(false);
          setLoadingConfig(false);
          return;
        }
        
        console.log('🔍 ScrollScene: User object:', user);
        console.log('🔍 ScrollScene: User email:', user?.email);
        
        const [hotspot, camera, sceneConfig] = await Promise.all([
          getHotspotSettings(undefined, userId, user),
          getCameraPathData(undefined, userId, user),
          getUserSceneConfig(userId, user)
        ]);

        // Scene settings loaded successfully

        setHotspotSettings(hotspot);
        
        // Always load camera path data from database first, with fallback to defaults
        if (!isManualEditMode) {
          console.log('🔄 Loading camera path data from database');
          setCameraPathData(camera);
          
          // Store original architect path for toggling
          if (camera?.cameraPoints && camera?.lookAtTargets) {
            originalArchitectPathRef.current = {
              cameraPoints: camera.cameraPoints,
              lookAtTargets: camera.lookAtTargets
            };
            
            // Sync to Zustand store
            setStoreCameraPoints(camera.cameraPoints)
            setStoreLookAtTargets(camera.lookAtTargets)
            console.log('💾 [SceneEditor] Saved original architect path:', camera.cameraPoints.length, 'waypoints');
          }
        } else {
          console.log('⚠️ Skipping camera path load - user is in manual edit mode');
        }
        
        setUserSceneConfig(sceneConfig);
        
        // Check if user has a custom configuration
        if (userId) {
          try {
            const sceneConfigService = SceneConfigService.getInstance();
            sceneConfigService.setUser(user);
            const userConfigs = await sceneConfigService.getUserConfigs();
            setHasUserConfig(userConfigs.length > 0);
          } catch (error) {
            console.warn('Failed to check user configs:', error);
            setHasUserConfig(false);
          }
        } else {
          setHasUserConfig(false);
        }

        console.log('✅ Scene settings state updated successfully');
      } catch (error) {
        console.error('❌ Failed to load scene settings:', error);
        console.log('🔄 Using default scene settings');
        setHasUserConfig(false);
        // Keep the default values already set
      } finally {
        setLoadingConfig(false);
      }
    };

    loadSettings();
  }, [user, isManualEditMode, authRole]);

  // Track if this is the first config load (don't auto-load on first login)
  const isFirstConfigLoad = useRef(true);

  // Load model when scene configuration is available
  useEffect(() => {
    if (userSceneConfig && sceneRef.current && !loadingConfig) {
      // Skip auto-load on first config load - let user choose which model to load
      if (isFirstConfigLoad.current) {
        console.log('🔄 Scene config loaded (first time), skipping auto-load - waiting for user selection');
        isFirstConfigLoad.current = false;
        return;
      }
      
      console.log('🔄 Scene config loaded, reloading model...');
      // Clear existing model
      if (sceneRef.current) {
        const existingModel = sceneRef.current.getObjectByName('floorPlan');
        if (existingModel) {
          sceneRef.current.remove(existingModel);
        }
      }
      
      // Reset path initialization state when loading new model
      gsapPathInitializedRef.current = false;
      pathProgressRef.current.t = 0;
      
      // Load new model with user's configuration
      loadModelWithService();
    }
  }, [userSceneConfig, loadingConfig]);
  // Load model function - moved outside createScene to be callable from useEffect
  const loadModelWithService = async () => {
    if (!sceneRef.current) {
      console.warn('Scene not ready for model loading');
      return;
    }

    try {
      // Clear existing model first
      const existingModel = sceneRef.current.getObjectByName('floorPlan');
      if (existingModel) {
        sceneRef.current.remove(existingModel);
        console.log('🗑️ Removed existing model before loading new one');
      }

      // Show loader immediately
      setShowLoader(true);
      setLoaderPercent(0);
      setLoaderLoadedMB(0);
      setLoaderTotalMB(null);

      const modelLoader = ModelLoader.getInstance();
      const currentConfig = userSceneConfig || SCENE_CONFIG;
      const modelPath = currentConfig.DEFAULT_MODEL_PATH;
      
      console.log('🎯 [ScrollScene] Model loading details:');
      console.log('  - User:', user?.email);
      console.log('  - UserSceneConfig:', userSceneConfig ? 'loaded' : 'null');
      console.log('  - CurrentConfig:', currentConfig === SCENE_CONFIG ? 'SCENE_CONFIG (default)' : 'userSceneConfig');
      console.log('  - Model Path:', modelPath);
      console.log('  - Config Name:', currentConfig.config_name || 'default');
      
      const result = await modelLoader.loadModel({
        modelPath,
        targetSize: currentConfig.TARGET_SIZE,
        rotationY: currentConfig.ROTATION_Y,
        scaleMultiplier: currentConfig.SCALE_MULTIPLIER,
        enableContourEdges: true,
        enableShadows: true,
        onProgress: (progress, loaded, total) => {
          setLoaderPercent(progress);
          setLoaderLoadedMB(loaded / 1024 / 1024);
          setLoaderTotalMB(total ? total / 1024 / 1024 : null);
        },
        onComplete: () => {
          setShowLoader(false);
        },
        onError: (error) => {
          console.error('ModelLoader error:', error);
          setShowLoader(false);
          createFloorPlanPlaceholder();
        }
      });

      const { model, clickableObjects, boundingSphere } = result;
      
      // Store hotspots for interaction
      clickableObjectsRef.current = clickableObjects;
      
      // Log total hotspots found
      console.log('Total transformed hotspots collected:', clickableObjects.length);
      console.log('All transformed hotspots:', clickableObjects);
      console.log('Hotspot names:', clickableObjects.map(obj => obj.name));
      
      // Create pulse markers for hotspots after they're loaded
      if (clickableObjects.length > 0) {
        setTimeout(() => {
          createHotspotPulseMarkers();
        }, 100); // Small delay to ensure scene is ready
      }

      // Apply shadows to the transformed model
      model.traverse((child: any) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      sceneRef.current.add(model);
      modelRef.current = model;
      setModelPath(modelPath);
      
      // Log final model position and rotation
      console.log('📐 MODEL LOADED - Position and Rotation:');
      console.log('  Model Position (X, Y, Z):', model.position.x.toFixed(3), model.position.y.toFixed(3), model.position.z.toFixed(3));
      console.log('  Model Rotation (X, Y, Z):', model.rotation.x.toFixed(3), model.rotation.y.toFixed(3), model.rotation.z.toFixed(3));
      console.log('  Model Rotation Y (degrees):', (model.rotation.y * 180 / Math.PI).toFixed(2));
      console.log('  Model Scale:', model.scale.x.toFixed(3));

      // Fit camera so the model is visible
      if (cameraRef.current) {
        const camera = cameraRef.current;
        const fitOffset = 1.6;
        const radius = Math.max(1e-3, boundingSphere.radius);
        const distance = fitOffset * radius / Math.tan((camera.fov * Math.PI / 180) / 2);
        const direction = new THREE.Vector3(1, 0.6, 1).normalize();
        const target = boundingSphere.center.clone();
        camera.position.copy(target.clone().add(direction.multiplyScalar(distance)));
        camera.near = Math.max(0.01, radius / 100);
        camera.far = Math.max(camera.near + 10, radius * 100);
        camera.updateProjectionMatrix();
        camera.lookAt(target);
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        // Avoid rendering a pre-intro still frame
        if (!WITH_INTRO || introCompletedRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      }

      // Start intro now that model is loaded (second intro only)
      if (WITH_INTRO && cameraRef.current && rendererRef.current && sceneRef.current) {
        // Set exact intro start frame (top view over cube)
        cameraRef.current.up.set(0, 1, 0);
        cameraRef.current.position.copy(INTRO_START_POS);
        cameraRef.current.lookAt(cubePos.current);
        cameraRef.current.updateProjectionMatrix();
        cameraRef.current.updateMatrixWorld();
        
        // CRITICAL: Update camera state with the actual starting position
        cameraStateRef.current.mainPathPosition.copy(INTRO_START_POS);
        cameraStateRef.current.journeyStartPosition.copy(INTRO_START_POS);
        cameraStateRef.current.isOnMainPath = true;
        
        console.log('🎯 UPDATED camera state with INTRO_START_POS:', {
          mainPathPosition: cameraStateRef.current.mainPathPosition,
          journeyStartPosition: cameraStateRef.current.journeyStartPosition,
          isOnMainPath: cameraStateRef.current.isOnMainPath
        });
        
        startIntroAnimation(cameraRef.current, rendererRef.current, sceneRef.current);
      }
      
      // Re-add path visuals after loading model
      if (gsapCurveRef.current && introCompletedRef.current) {
        console.log('🎨 [loadModelWithService] Re-adding path visuals after model load');
        addPathVisuals(gsapCurveRef.current);
        
        // Force render to show path visuals
        if (rendererRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      }

    } catch (error) {
      console.error('Error loading model:', error);
      setShowLoader(false);
      createFloorPlanPlaceholder();
    }
  };

  // Create fallback placeholder function - moved outside createScene
  const createFloorPlanPlaceholder = () => {
    if (!sceneRef.current) {
      console.warn('Scene not ready for placeholder creation');
      return;
    }

    console.log('Creating fallback placeholder');
    const placeholderGeometry = new THREE.BoxGeometry(10, 2, 10);
    const placeholderMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFF0000, // Red color to make it very visible
      transparent: true,
      opacity: 0.5
    });
    const placeholder = new THREE.Mesh(placeholderGeometry, placeholderMaterial);
    placeholder.name = 'floorPlan';
    placeholder.position.set(0, 1, 0);
    placeholder.castShadow = true;
    placeholder.receiveShadow = true;
    sceneRef.current.add(placeholder);
    console.log('Floor plan placeholder created at position:', placeholder.position);
    console.log('Placeholder added to scene');
  };

  // Clear current model from scene - shared function to avoid duplication
  const clearCurrentModel = () => {
    if (!sceneRef.current) {
      console.warn('🗑️ [ScrollScene] Scene not ready for clearing model');
      return;
    }

    console.log('🗑️ [ScrollScene] Clearing current model from scene');
    console.log('🗑️ [ScrollScene] Current scene children:', sceneRef.current.children.length);
    
    // Remove ALL models from the scene (not just 'floorPlan')
    // This ensures we don't have stacking models
    const modelsToRemove: THREE.Object3D[] = [];
    
    sceneRef.current.children.forEach((child) => {
      // Remove any object that looks like a loaded model
      // Skip lights, helpers, cameras, and debug markers
      if (
        child.type === 'Group' || 
        child.type === 'Scene' ||
        child.name === 'floorPlan' ||
        (child.type === 'Mesh' && !child.name.includes('debug_') && !child.name.includes('pulse_'))
      ) {
        // Check if this is likely a loaded model (has children or is named floorPlan)
        if (child.name === 'floorPlan' || (child as any).children?.length > 0) {
          modelsToRemove.push(child);
          console.log('🗑️ [ScrollScene] Marking for removal:', child.name, 'type:', child.type, 'children:', (child as any).children?.length);
        }
      }
    });
    
    // Remove all marked models
    modelsToRemove.forEach((model) => {
      sceneRef.current?.remove(model);
      console.log('🗑️ [ScrollScene] Removed model:', model.name);
    });
    
    console.log('🗑️ [ScrollScene] Removed', modelsToRemove.length, 'models from scene');
    console.log('🗑️ [ScrollScene] Remaining scene children:', sceneRef.current.children.length);
    
    // Clear clickable objects
    clickableObjectsRef.current = [];
    
    // Clear pulse markers
    cleanupPulseMarkers();
    
    // Remove path visuals (red line and waypoint spheres)
    removePathVisuals();
    console.log('🗑️ [ScrollScene] Path visuals removed');
    
    console.log('🗑️ [ScrollScene] Scene cleared successfully');
    
    modelRef.current = null;
    if (measurementGroupRef.current) {
      measurementGroupRef.current.parent?.remove(measurementGroupRef.current);
      measurementGroupRef.current = null;
    }
  };
  // Handle follow path selection and reload camera data
  useEffect(() => {
    const handleSceneReloadCamera = (e: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🎬 [ScrollScene] Scene reload camera event received:', e.detail);
      }
      
      if (e.detail && e.detail.cameraPoints) {
        // Convert camera points to THREE.Vector3 objects
        const newCameraPoints = e.detail.cameraPoints.map((point: any) => 
          new THREE.Vector3(point.x, point.y, point.z)
        );
        
        // Convert look at targets to THREE.Vector3 objects if provided
        const newLookAtTargets = e.detail.lookAtTargets ? 
          e.detail.lookAtTargets.map((target: any) => 
            new THREE.Vector3(target.x, target.y, target.z)
          ) : undefined;
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🎬 [ScrollScene] Updating camera path with', newCameraPoints.length, 'points');
        }
        
        // Update camera path data
        setCameraPathData(prev => ({
          ...prev,
          cameraPoints: newCameraPoints,
          ...(newLookAtTargets && { lookAtTargets: newLookAtTargets })
        }));
        
        // Reset scroll progress to restart the path
        setScrollProgress(0);
        
        // Reset GSAP path initialization to force recreation
        gsapPathInitializedRef.current = false;
        
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ [ScrollScene] Camera path updated successfully');
        }
      }
    };

    console.log('🎧 [EVENT LISTENER] Registered: scene-reload-camera');
    window.addEventListener('scene-reload-camera', handleSceneReloadCamera);

    return () => {
      console.log('🔌 [EVENT LISTENER] Removed: scene-reload-camera');
      window.removeEventListener('scene-reload-camera', handleSceneReloadCamera);
    };
  }, []);

  useEffect(() => {
    if (!roomPlanJsonPath) {
      return;
    }

    let cancelled = false;

    const loadMetadata = async () => {
      try {
        console.log('📐 [Measurements] Fetching RoomPlan metadata from', roomPlanJsonPath);
        const response = await fetch(roomPlanJsonPath);
        if (!response.ok) {
          console.warn('⚠️ [Measurements] Failed to load metadata:', response.status);
          return;
        }
        const data: RoomPlanMetadata = await response.json();
        if (!cancelled) {
          setRoomPlanMetadata(data);
        }
      } catch (error) {
        console.error('❌ [Measurements] Error loading RoomPlan metadata:', error);
      }
    };

    loadMetadata();

    return () => {
      cancelled = true;
    };
  }, [roomPlanJsonPath, setRoomPlanMetadata]);

  useEffect(() => {
    if (!sceneRef.current) {
      return;
    }

    if (measurementGroupRef.current) {
      measurementGroupRef.current.parent?.remove(measurementGroupRef.current);
      measurementGroupRef.current = null;
    }

    if (!showMeasurements || !roomPlanMetadata) {
      if (rendererRef.current && cameraRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      return;
    }

    const scene = sceneRef.current;
    const model = modelRef.current ?? scene?.getObjectByName('floorPlan') ?? null;

    if (!scene || !model) {
      console.warn('📐 [Measurements] Cannot align measurements - scene/model missing');
      return;
    }

    model.updateMatrixWorld(true);

    const modelBox = new THREE.Box3().setFromObject(model);
    const modelSize = modelBox.getSize(new THREE.Vector3());
    const modelCenter = modelBox.getCenter(new THREE.Vector3());

    const measurementGroup = createRoomMeasurements(roomPlanMetadata, true, 1);
    measurementGroupRef.current = measurementGroup;

    const metadataBox = new THREE.Box3().setFromObject(measurementGroup);
    if (metadataBox.isEmpty()) {
      console.warn('📐 [Measurements] Metadata bounding box is empty, skipping overlay');
      measurementGroupRef.current = null;
      return;
    }

    const metadataSize = metadataBox.getSize(new THREE.Vector3());
    const metadataCenter = metadataBox.getCenter(new THREE.Vector3());

    const scaleX = metadataSize.x !== 0 ? modelSize.x / metadataSize.x : 1;
    const scaleY = metadataSize.y !== 0 ? modelSize.y / metadataSize.y : scaleX;
    const scaleZ = metadataSize.z !== 0 ? modelSize.z / metadataSize.z : 1;

    const uniformHorizontalScale = Number.isFinite(scaleX) && Number.isFinite(scaleZ) && scaleX > 0 && scaleZ > 0
      ? (scaleX + scaleZ) / 2
      : model.scale.x;
    const verticalScale = Number.isFinite(scaleY) && scaleY > 0 ? scaleY : uniformHorizontalScale;

    const toOrigin = new THREE.Matrix4().makeTranslation(-metadataCenter.x, -metadataCenter.y, -metadataCenter.z);
    measurementGroup.applyMatrix4(toOrigin);

    measurementGroup.scale.set(uniformHorizontalScale, verticalScale, uniformHorizontalScale);
    measurementGroup.quaternion.copy(model.quaternion);
    measurementGroup.position.copy(modelCenter);
    measurementGroup.matrixAutoUpdate = true;
    measurementGroup.updateMatrixWorld(true);

    scene.add(measurementGroup);
    console.log('📐 [Measurements] Overlay aligned', {
      modelSize,
      metadataSize,
      uniformHorizontalScale,
      verticalScale,
    });

    if (rendererRef.current && cameraRef.current) {
      rendererRef.current.render(scene, cameraRef.current);
    }

    return () => {
      if (measurementGroupRef.current && measurementGroupRef.current.parent) {
        measurementGroupRef.current.parent.remove(measurementGroupRef.current);
      }
      measurementGroupRef.current = null;
    };
  }, [showMeasurements, roomPlanMetadata, modelPath]);
  // Handle external waypoint navigation requests
  useEffect(() => {
    const handleGotoWaypoint = (e: any) => {
      console.log('[ScrollScene] camera-goto-waypoint received:', e?.detail);
      if (!gsapCurveRef.current || !cameraRef.current) {
        console.warn('[ScrollScene] Waypoint handler: missing gsapCurveRef or cameraRef');
        return;
      }
      // Map 1-based waypoint index to curve parameter t based on current cameraPathData length
      const totalPoints = (cameraPathData?.cameraPoints?.length ?? gsapCurveRef.current.points.length);
      const total = Math.max(1, totalPoints - 1);
      const clampedIndex1Based = Math.max(1, Math.min(totalPoints, (e?.detail?.index ?? 1)));
      const zeroBased = clampedIndex1Based - 1;
      const t = zeroBased / total;
      console.log('[ScrollScene] Calculated waypoint mapping:', { totalPoints, clampedIndex1Based, zeroBased, t });

      // Use the scene's own path progress system so the render loop updates camera
      // Kill any existing tweens on pathProgressRef
      try { gsap.killTweensOf(pathProgressRef.current); } catch {}
      isAnimatingRef.current = true;
      const currentT = pathProgressRef.current.t ?? 0;
      console.log('[ScrollScene] Animating path progress:', { from: currentT, to: t });
      gsap.to(pathProgressRef.current, {
        duration: 1.2,
        t,
        ease: 'power3.out',
        onUpdate: () => {
          if (cameraRef.current) {
            updateCameraAlongCurve(cameraRef.current, pathProgressRef.current.t);
            // Force render while animating, since main loop may skip when isAnimatingRef is true
            if (rendererRef.current && sceneRef.current) {
              rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
          }
        },
        onComplete: () => {
          isAnimatingRef.current = false;
          console.log('[ScrollScene] Waypoint animation complete at t=', pathProgressRef.current.t);
        }
      });
    };

    console.log('🎧 [EVENT LISTENER] Registered: camera-goto-waypoint');
    window.addEventListener('camera-goto-waypoint', handleGotoWaypoint);
    return () => {
      console.log('🔌 [EVENT LISTENER] Removed: camera-goto-waypoint');
      window.removeEventListener('camera-goto-waypoint', handleGotoWaypoint);
    };
  }, []);

  // Toggle flags
  const WITH_INTRO = true; // Toggle to control intro animation
  const WITH_HELPERS = true; // Toggle to show coordinate helpers (floor grid, axes)
  const SHOW_CUBE = false; // Toggle to show/hide the green debug cube
  // Camera type now controlled by storeCameraType (orbital uses circular waypoints, path uses scroll)
  const [showDebug, setShowDebug] = useState(false); // Toggle to show/hide debug panel
  const [showPosition, setShowPosition] = useState(false); // Toggle to show/hide position panel
  
  // Loader overlay state (React component instead of DOM manipulation)
  const [showLoader, setShowLoader] = useState(false);
  const [loaderPercent, setLoaderPercent] = useState(0);
  const [loaderLoadedMB, setLoaderLoadedMB] = useState(0);
  const [loaderTotalMB, setLoaderTotalMB] = useState<number | null>(null);

  // Camera path editor state
  const [activePathId, setActivePathId] = useState('main-camera-path');
  const isTestingCameraRef = useRef(false);
  const isAnimatingToBirdView = useRef(false);
  const isAnimatingFromBirdView = useRef(false);
  const originalCameraPosition = useRef(new THREE.Vector3());
  const originalCameraLookAt = useRef(new THREE.Vector3());
  const INTRO_START_POS = new THREE.Vector3(0, 70, 3);
  
  // Get SHOW_DEBUG from URL parameter
  const getShowDebugFromURL = () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('SHOW_DEBUG') === 'true';
    }
    return false;
  };
  const SHOW_DEBUG = getShowDebugFromURL(); // Master flag to show/hide debug controls
  // Optional debug visuals for the camera path
  // Get path visibility from Zustand store (can be toggled)
  const showPathVisuals = useCameraStore(state => state.showPathVisuals);
  const SHOW_CAMERA_PATH = showPathVisuals;
  const SHOW_WAYPOINTS = showPathVisuals;
  const SHOW_LOOKUP_TARGETS = true;
  
  // Update path visuals when showPathVisuals changes
  useEffect(() => {
    if (gsapCurveRef.current) {
      console.log('🔄 [showPathVisuals changed] Updating path visuals, showPathVisuals:', showPathVisuals);
      addPathVisuals(gsapCurveRef.current);
      
      // Force render to show the changes
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        console.log('✅ [showPathVisuals changed] Scene re-rendered with path visuals');
      }
    }
  }, [showPathVisuals]);
  
  // Hotspot highlight colors
  const HOTSPOT_HIGHLIGHT_COLOR = 0x00ff00; // Bright green for model hotspots
  const CUBE_HIGHLIGHT_COLOR = 0xff0000; // Red for cube
  const CUBE_NORMAL_COLOR = 0x00ff00; // Green for cube normal state
  
  // Get hotspot settings from configuration
  const HOTSPOT_FOCAL_DISTANCES = hotspotSettings?.focalDistances || {};
  const HOTSPOT_CATEGORIES = hotspotSettings?.categories || {};
  
  
  // Single bright purple color for all hotspot hovers
  const HOTSPOT_HOVER_COLOR = hotspotSettings?.colors?.HOVER || 0xb2d926;
  const HOTSPOT_COMPLEMENTARY_HOVER_COLOR = hotspotSettings?.colors?.HOVER || 0xb2d926;

  // Edge (contour) colors for outlines
  const EDGE_COLOR_NORMAL = 0x000000; // black
  const EDGE_COLOR_HOVER = 0xffffff; // white

  // Safely recolor any edge line children added via EdgesGeometry under a mesh
  const setEdgeLineColorForMesh = (object: THREE.Object3D | null, colorHex: number) => {
    if (!object) return;
    object.traverse((child) => {
      const anyChild = child as any;
      if (anyChild?.userData?.isEdgeLine && anyChild.material) {
        const mat = anyChild.material as THREE.LineBasicMaterial;
        if (mat && typeof (mat as any).color?.setHex === 'function') {
          mat.color.setHex(colorHex);
        }
      }
    });
  };

  // Track which object currently has its edge lines forced to hover color
  const lastOutlinedObjectRef = useRef<THREE.Object3D | null>(null);

  // Pulse marker colors
  //const PULSE_MARKER_COLOR = 0x8b5cf6; // Purple color for inner dot
  const PULSE_MARKER_COLOR = 0x8C33FF; // Bright Purple color for inner dot
  const PULSE_RING_COLOR = 0xff00ff; // Magenta color for hover ring

  // Scene configuration constants
  const CUBE_SIZE = 5;
  const CUBE_POSITION = new THREE.Vector3(0, 0, 0); // Centered on X-axis
  const FLOOR_SIZE = 800;
  const FLOOR_Y_POSITION = 0;
  const WALL_SIZE = 40;
  const WALL_HEIGHT = 6; // Height 6
  const WALL_THICKNESS = 1; // Wall thickness constant
  const WALL_Y_POSITION = 3; // Half of WALL_HEIGHT from Y=0
  const BACK_WALL_Z = -20;
  const LEFT_WALL_X = -20; // Equal distance from center
  const RIGHT_WALL_X = 20; // Equal distance from center
  const FRONT_WALL_Z = 20; // Add front wall position
  
  // Camera configuration
  const CAMERA_FOV = SCENE_CONFIG.CAMERA_FOV;
  const CAMERA_NEAR = SCENE_CONFIG.CAMERA_NEAR;
  const CAMERA_FAR = SCENE_CONFIG.CAMERA_FAR;
  const ORBITAL_HEIGHT = SCENE_CONFIG.ORBITAL_HEIGHT;
  const ORBITAL_RADIUS_MULTIPLIER = SCENE_CONFIG.ORBITAL_RADIUS_MULTIPLIER;
  const ORBITAL_SPEED = SCENE_CONFIG.ORBITAL_SPEED;
  
  // Animation configuration
  // const INTRO_START_POS = new THREE.Vector3(0, 50, 3); // Start perfectly above the cube center - using the one defined above
  // Intro ends at first orbital waypoint (45 degrees northeast)
  // Use storeOrbitalHeight for Y coordinate to match the actual orbital path
  const INTRO_END_POS = new THREE.Vector3(35.36, storeOrbitalHeight, 35.36); // 45° - matches first orbital waypoint
  const ORBITAL_START_POS = new THREE.Vector3(35.36, storeOrbitalHeight, 35.36); // Same as intro end
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🎬 INTRO ANIMATION SPEED CONTROLS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Total Duration = ANIMATION_STEPS × ANIMATION_STEP_INTERVAL
  // 
  // Examples:
  //   - 100 steps × 17ms = 1700ms = 1.7 seconds (current)
  //   - 50 steps × 17ms = 850ms = 0.85 seconds (2x faster)
  //   - 40 steps × 17ms = 680ms = 0.68 seconds (2.5x faster)
  //
  // To speed up 2x: Change ANIMATION_STEPS from 100 to 50
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const ANIMATION_STEPS = 50;         // Number of animation frames (lower = faster)
  const ANIMATION_STEP_INTERVAL = 17;  // Milliseconds per frame (~60fps at 17ms)
  
  // Colors - Dynamic based on theme (Three.js specific)
  const getThreeJSThemeColors = () => {
    const themeColors = getThemeColors();
    const backgroundHex = cssColorToHex(themeColors.baseBackground);
    
    if (themeColors.isDark) {
      return {
        BACKGROUND_COLOR: backgroundHex, // Dynamic from theme
        FLOOR_COLOR: 0x1f2937, // Dark floor
        WALL_COLOR: 0x04070E, // Dark walls
        CUBE_COLOR: 0x00ff00, // Green (keep same)
        CUBE_EMISSIVE_COLOR: 0x003300, // Dark green (keep same)
        GRID_COLOR_MAJOR: 0x444444, // Dark grid major lines
        GRID_COLOR_MINOR: 0x222222, // Dark grid minor lines
        AXES_COLOR: 0x666666, // Dark axes color
        HOTSPOT_NORMAL_COLOR: 0xffffff, // LINO
      };
    } else {
      return {
        BACKGROUND_COLOR: backgroundHex, // Dynamic from theme
        FLOOR_COLOR: 0xccc1b1, // LINO floor
        WALL_COLOR: 0xffffff, // White walls
        CUBE_COLOR: 0x00ff00, // Green
        CUBE_EMISSIVE_COLOR: 0x003300, // Dark green
        GRID_COLOR_MAJOR: 0x888888, // Light grid major lines
        GRID_COLOR_MINOR: 0xcccccc, // Light grid minor lines
        AXES_COLOR: 0x333333, // Light axes color
        HOTSPOT_NORMAL_COLOR: 0xffffff, // LINO
      };
    }
  };
  
  const mountRef = useRef<HTMLDivElement>(null);
  const animationIdRef = useRef<number>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cubePos = useRef(CUBE_POSITION);
  const cubeRef = useRef<THREE.Mesh | null>(null);
  const startTimeRef = useRef<number | null>(null);
  // Live lookAt tracking for Position Panel
  const [currentLookAtTarget, setCurrentLookAtTarget] = useState<THREE.Vector3 | null>(null);

  useEffect(() => {
    if (!showPosition) return;
    const computeCurrentLookAt = () => {
      if (!cameraRef.current) return;
      const camera = cameraRef.current;
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      const distance = 100; // project a point sufficiently far in front
      const point = camera.position.clone().add(dir.multiplyScalar(distance));
      setCurrentLookAtTarget(point);
    };
    // Initialize and then update on pointer movement
    computeCurrentLookAt();
    console.log('🎧 [EVENT LISTENER] Registered: mousemove (computeCurrentLookAt)');
    console.log('🎧 [EVENT LISTENER] Registered: touchmove (computeCurrentLookAt)');
    window.addEventListener('mousemove', computeCurrentLookAt, { passive: true });
    window.addEventListener('touchmove', computeCurrentLookAt, { passive: true });
    return () => {
      console.log('🔌 [EVENT LISTENER] Removed: mousemove/touchmove (computeCurrentLookAt)');
      window.removeEventListener('mousemove', computeCurrentLookAt as EventListener);
      window.removeEventListener('touchmove', computeCurrentLookAt as EventListener);
    };
  }, [showPosition]);
  // Keep these for progress tracking
  const loaderTotalBytesRef = useRef<number | null>(null);
  const loaderLoadedBytesRef = useRef<number>(0);

  const bytesToMB = (bytes: number) => bytes / 1024 / 1024;
  
  const introAnimRef = useRef({
    fromPos: INTRO_START_POS,
    toPos: INTRO_END_POS,
    t: 0
  });
  
  const hasIntroRef = useRef(false); // Track if intro is complete
  const introCompletedRef = useRef(false); // Track intro completion
  const orbitalReachedRef = useRef(false);
  const introStartedRef = useRef<boolean>(false); // Guard to avoid duplicate intros
  const introTimeoutRef = useRef<number | null>(null); // Track intro timers for cleanup
  

  const pathLineRef = useRef<THREE.Line | null>(null);
  const waypointGroupRef = useRef<THREE.Group | null>(null);
  
  // Raycaster for hotspot interaction
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const [hoveredHotspot, setHoveredHotspot] = useState<THREE.Object3D | null>(null);
  const [clickedHotspot, setClickedHotspot] = useState<THREE.Object3D | null>(null);
  const [isFocusedOnHotspot, setIsFocusedOnHotspot] = useState(false);
  const isFocusedOnHotspotRef = useRef(false); // Ref for animation loop access
  const clickableObjectsRef = useRef<THREE.Object3D[]>([]);
  const hotspotColorsRef = useRef<Map<THREE.Object3D, number>>(new Map());
  const originalCameraPositionRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const originalCameraLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const targetCameraPositionRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const isAnimatingRef = useRef(false);

  // Debug state
  const [debugInfo, setDebugInfo] = useState<{
    cameraPos: number[];
    scrollTop: number;
    scrollHeight: number;
    progress: number;
    progressPercent: number;
    windowHeight: number;
    windowWidth: number;
    currentSection: string;
    loaderPercent: number;
    loaderLoadedMB: number | undefined;
    loaderTotalMB: number | undefined;
  } | null>(null);
  // Gallery system state
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [currentHotspot, setCurrentHotspot] = useState<string>('');
  const [galleryAnimating, setGalleryAnimating] = useState(false);
  
  // Marker description state
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  
  
  // GSAP-driven scroll path (preview path points and targets)
  // ✨ ZUSTAND APPROACH: Use live data from store, fallback to database config
  const gsapCameraPoints = storeCameraPoints.length > 0 ? storeCameraPoints.map(p => new THREE.Vector3(p.x, p.y, p.z)) : (cameraPathData?.cameraPoints || []);
  const gsapLookAtTargets = storeLookAtTargets.length > 0 ? storeLookAtTargets.map(p => new THREE.Vector3(p.x, p.y, p.z)) : (cameraPathData?.lookAtTargets || []);
  const gsapCurveRef = useRef<THREE.CatmullRomCurve3 | null>(null);
  const gsapLookAtTargetsRef = useRef<THREE.Vector3[]>(gsapLookAtTargets);
  const gsapLookCurveRef = useRef<THREE.CatmullRomCurve3 | null>(null);
  const pathProgressRef = useRef<{ t: number }>({ t: 0 });
  const gsapPathInitializedRef = useRef<boolean>(false);

  // Create curves when we have valid data
  useEffect(() => {
    // Don't recreate curves during manual editing to prevent camera jumps
    const suppressResume = (window as any)?.__suppressCameraResume === true;
    if (isManualEditMode || suppressResume) return;
    
    if (gsapCameraPoints && gsapCameraPoints.length > 0) {
      try {
        gsapCurveRef.current = new THREE.CatmullRomCurve3(gsapCameraPoints, false, 'catmullrom', 0.1);
      } catch (error) {
        console.error('❌ Failed to create GSAP curve:', error);
        gsapCurveRef.current = null;
      }
    } else {
      gsapCurveRef.current = null;
    }
    
    if (gsapLookAtTargets && gsapLookAtTargets.length > 0) {
      try {
        gsapLookAtTargetsRef.current = gsapLookAtTargets;
        gsapLookCurveRef.current = new THREE.CatmullRomCurve3(gsapLookAtTargets, false, 'catmullrom', 0.1);
      } catch (error) {
        console.error('❌ Failed to create look-at curve:', error);
        gsapLookCurveRef.current = null;
      }
    } else {
      gsapLookCurveRef.current = null;
    }
  }, [gsapCameraPoints, gsapLookAtTargets, isManualEditMode]);

  // Update path visuals when camera points change (throttled)
  const updateVisualsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPointsHashRef = useRef<string>('');
  
  useEffect(() => {
    // MEMORY LEAK FIX: Only update if points actually changed
    // Create hash of points to detect real changes
    const pointsHash = storeCameraPoints.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)}`).join('|');
    
    if (pointsHash === lastPointsHashRef.current) {
      console.log('⏭️ [SceneEditor] Skipping path visual update - points unchanged');
      return;
    }
    
    lastPointsHashRef.current = pointsHash;
    
    // Clear previous timeout to debounce rapid updates
    if (updateVisualsTimeoutRef.current) {
      clearTimeout(updateVisualsTimeoutRef.current);
    }
    
    // Update visuals when store data changes (including during drag for real-time feedback)
    const isDragging = (window as any)?.__suppressCameraResume === true;
    
    if (gsapCameraPoints && gsapCameraPoints.length > 0 && introCompletedRef.current) {
      console.log('🔄 [SceneEditor] Path visual update scheduled - points changed', { isDragging });
      
      // Use different debounce timing: immediate during drag, delayed otherwise
      const debounceTime = isDragging ? 0 : 300;
      
      // Debounce visual updates to prevent excessive re-renders
      updateVisualsTimeoutRef.current = setTimeout(() => {
        console.log('🎨 [SceneEditor] Executing path visual update');
        try {
          const visualCurve = new THREE.CatmullRomCurve3(gsapCameraPoints, false, 'catmullrom', 0.1);
          removePathVisuals();
          addPathVisuals(visualCurve);
          
          if (rendererRef.current && cameraRef.current && sceneRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
          }
        } catch (error) {
          console.error('❌ Failed to create visual curve:', error);
        }
      }, debounceTime);
    }
    
    return () => {
      if (updateVisualsTimeoutRef.current) {
        clearTimeout(updateVisualsTimeoutRef.current);
      }
    };
  }, [storeCameraPoints, storeLookAtTargets]); // CRITICAL: Only depend on store data, not derived gsap arrays

  const updateCameraAlongCurve = (camera: THREE.PerspectiveCamera, t: number) => {
    if (!gsapCurveRef.current) {
      return; // Safety check
    }
    
    // Check if curve has enough points
    if (!gsapCurveRef.current.points || gsapCurveRef.current.points.length < 2) {
      return; // Safety check
    }
    
    const clampedT = Math.max(0, Math.min(1, t));
    // Broadcast path progress for external UI (e.g., TimelineWaypoints)
    try {
      window.dispatchEvent(new CustomEvent('camera-path-progress', { detail: { t: clampedT } }));
    } catch {}
    
    try {
      const point = gsapCurveRef.current.getPointAt(clampedT);
      
      if (!point || typeof point.x !== 'number') {
        return;
      }
      
    camera.position.copy(point);

    // Smooth look-at using either a look-targets curve or the path tangent as fallback
    let lookTarget: THREE.Vector3 | null = null;
    if (gsapLookCurveRef.current && (gsapLookCurveRef.current as any).points?.length > 1) {
      lookTarget = gsapLookCurveRef.current.getPointAt(clampedT);
    } else {
      const tangent = gsapCurveRef.current.getTangentAt(clampedT).normalize();
      const lookDistance = 5; // forward distance
      lookTarget = point.clone().add(tangent.multiplyScalar(lookDistance));
      // keep look height close to current to avoid pitching too much
      lookTarget.y = point.y;
    }
    
    camera.lookAt(lookTarget);
    // Update debug with live camera position during scroll-driven path
    if (setDebugInfo) {
      setDebugInfo((prev: any) => ({
        ...(prev || {}),
        cameraPos: [camera.position.x, camera.position.y, camera.position.z],
        // Preserve scroll data
        scrollTop: prev?.scrollTop || 0,
        scrollHeight: prev?.scrollHeight || 0,
        scrollPercentage: prev?.scrollPercentage || 0,
        progress: prev?.progress || 0,
        progressPercent: prev?.progressPercent || 0
      }));
    }
    } catch (error) {
      // Silent error handling - curve operations failed
    }
  };

  const removePathVisuals = () => {
    if (!sceneRef.current) return;
    if (pathLineRef.current) {
      sceneRef.current.remove(pathLineRef.current);
      pathLineRef.current.geometry.dispose();
      // material dispose optional for LineBasicMaterial
      pathLineRef.current = null;
    }
    if (waypointGroupRef.current) {
      waypointGroupRef.current.children.forEach((c) => {
        const mesh = c as THREE.Mesh;
        mesh.geometry.dispose();
        if (Array.isArray((mesh as any).material)) (mesh as any).material.forEach((m: any) => m.dispose());
        else (mesh as any).material.dispose();
      });
      sceneRef.current.remove(waypointGroupRef.current);
      waypointGroupRef.current = null;
    }
  };
  
  // Real-time event tracking for debug panel
  useEffect(() => {
    if (!showDebug) return;

    // Initialize counters
    (window as any).__touchStartCount = 0;
    (window as any).__touchMoveCount = 0;
    (window as any).__touchEndCount = 0;
    (window as any).__wheelCount = 0;
    (window as any).__scrollCount = 0;
    (window as any).__clickCount = 0;

    const trackEvent = (eventType: string) => {
      (window as any).__lastEventTime = Date.now();
      (window as any).__lastEventType = eventType;
    };

    const wheelHandler = () => {
      trackEvent('wheel');
      (window as any).__wheelCount = ((window as any).__wheelCount || 0) + 1;
    };

    const touchStartHandler = () => {
      trackEvent('touchstart');
      (window as any).__touchStartCount = ((window as any).__touchStartCount || 0) + 1;
    };

    const touchMoveHandler = () => {
      trackEvent('touchmove');
      (window as any).__touchMoveCount = ((window as any).__touchMoveCount || 0) + 1;
    };

    const touchEndHandler = () => {
      trackEvent('touchend');
      (window as any).__touchEndCount = ((window as any).__touchEndCount || 0) + 1;
    };

    const scrollHandler = () => {
      trackEvent('scroll');
      (window as any).__scrollCount = ((window as any).__scrollCount || 0) + 1;
    };

    const clickHandler = () => {
      trackEvent('click');
      (window as any).__clickCount = ((window as any).__clickCount || 0) + 1;
    };

    const keyHandler = () => trackEvent('keydown');

    // Add event listeners for tracking
    console.log('🎧 [EVENT LISTENER] Registered: wheel (scroll tracking)');
    console.log('🎧 [EVENT LISTENER] Registered: touchstart/touchmove/touchend (scroll tracking)');
    console.log('🎧 [EVENT LISTENER] Registered: scroll (scroll tracking)');
    console.log('🎧 [EVENT LISTENER] Registered: click (scroll tracking)');
    console.log('🎧 [EVENT LISTENER] Registered: keydown (scroll tracking)');
    window.addEventListener('wheel', wheelHandler, { passive: true });
    window.addEventListener('touchstart', touchStartHandler, { passive: true });
    window.addEventListener('touchmove', touchMoveHandler, { passive: true });
    window.addEventListener('touchend', touchEndHandler, { passive: true });
    window.addEventListener('scroll', scrollHandler, { passive: true });
    window.addEventListener('click', clickHandler, { passive: true });
    window.addEventListener('keydown', keyHandler, { passive: true });

    return () => {
      console.log('🔌 [EVENT LISTENER] Removed: scroll tracking listeners (7 total)');
      window.removeEventListener('wheel', wheelHandler);
      window.removeEventListener('touchstart', touchStartHandler);
      window.removeEventListener('touchmove', touchMoveHandler);
      window.removeEventListener('touchend', touchEndHandler);
      window.removeEventListener('scroll', scrollHandler);
      window.removeEventListener('click', clickHandler);
      window.removeEventListener('keydown', keyHandler);
    };
  }, [showDebug]);

  // Clean up debug spheres when showDebug changes
  useEffect(() => {
    if (sceneRef.current) {
      // Remove all debug spheres when showDebug is disabled
      if (!showDebug) {
        console.log('🧹 CLEANING UP DEBUG SPHERES (showDebug disabled)...');
        let removedCount = 0;
        
        // Get all children and remove debug markers
        const childrenToRemove: THREE.Object3D[] = [];
        sceneRef.current.children.forEach((child: THREE.Object3D) => {
          if (child.name === 'debug_hotspot_marker' || 
              child.name === 'debug_camera_marker' || 
              child.name === 'debug_return_from_marker' || 
              child.name === 'debug_return_to_marker' ||
              child.name === 'debug_intro_start_marker' || 
              child.name === 'debug_intro_end_marker') {
            childrenToRemove.push(child);
            removedCount++;
          }
        });
        
        // Remove the debug markers
        childrenToRemove.forEach(child => {
          sceneRef.current?.remove(child);
        });
        
        console.log('🧹 Removed', removedCount, 'debug spheres');
        
        // Force a render to update the scene
        if (rendererRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      }
    }
  }, [showDebug]);

  // Touch event tracking for mobile debugging
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const touchStartHandler = () => {
      setEventCounts(prev => ({ ...prev, touchstart: prev.touchstart + 1 }));
      console.log('📱 Touch start detected');
    };
    
    const touchMoveHandler = () => {
      setEventCounts(prev => ({ ...prev, touchmove: prev.touchmove + 1 }));
      console.log('📱 Touch move detected');
    };
    
    const touchEndHandler = () => {
      setEventCounts(prev => ({ ...prev, touchend: prev.touchend + 1 }));
      // console.log('📱 Touch end detected');
    };
    
    const wheelHandler = () => {
      setEventCounts(prev => ({ ...prev, wheel: prev.wheel + 1 }));
      // console.log('🖱️ Wheel event detected');
    };
    
    // Add event listeners
    window.addEventListener('touchstart', touchStartHandler, { passive: true });
    window.addEventListener('touchmove', touchMoveHandler, { passive: true });
    window.addEventListener('touchend', touchEndHandler, { passive: true });
    window.addEventListener('wheel', wheelHandler, { passive: true });
    
    return () => {
      window.removeEventListener('touchstart', touchStartHandler);
      window.removeEventListener('touchmove', touchMoveHandler);
      window.removeEventListener('touchend', touchEndHandler);
      window.removeEventListener('wheel', wheelHandler);
    };
  }, []);
  // Event counters for debug panel
  const [eventCounts, setEventCounts] = useState({
    wheel: 0,
    touchstart: 0,
    touchmove: 0,
    touchend: 0,
    click: 0,
    keydown: 0
  });
  // Gallery system functions
  const loadGalleryImages = async (hotspotName: string) => {
    setGalleryLoading(true);
    setCurrentHotspot(hotspotName);
    
    try {
      // Extract the category from hotspot name and normalize to API keys
      const rawKey = hotspotName.replace('Hotspot_geo_', '');
      const API_HOTSPOT_KEY_ALIASES = SCENE_CONFIG.API_HOTSPOT_KEY_ALIASES;
      const normalizedKey = API_HOTSPOT_KEY_ALIASES[rawKey] || rawKey;
      
      // Try API first, then fallback to static data
      const encodedCategory = encodeURIComponent(normalizedKey);
      console.log('🖼️ API hotspot key:', rawKey, '→ normalized:', normalizedKey, '→ encoded:', encodedCategory);
      const requestUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/api/gallery?hotspot=${encodedCategory}`
        : `/api/gallery?hotspot=${encodedCategory}`;
      
      console.log('🖼️ ===== MAKING API CALL (hotspot click) =====');
      console.log('🖼️ API requestUrl:', requestUrl);
      console.log('🖼️ Window location origin:', window.location.origin);
      console.log('🖼️ Hotspot click payload:', { hotspotName, rawKey, normalizedKey, encodedCategory });
      
      const response = await fetch(requestUrl, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
      });
      
      console.log('🖼️ API response status:', response.status);
      console.log('🖼️ API response ok:', response.ok);
      console.log('🖼️ API response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const text = await response.text();
          throw new Error(`Invalid content-type: ${contentType}. Body starts with: ${text.slice(0, 200)}`);
        }
        const images = await response.json();
        console.log('🖼️ API JSON parsed. Images length:', Array.isArray(images) ? images.length : 'N/A');
        setGalleryImages(images);
      } else {
        const errorText = await response.text().catch(() => '');
        console.log('🖼️ ===== API ERROR =====');
        console.log('🖼️ Status:', response.status);
        console.log('🖼️ Status Text:', response.statusText);
        console.log('🖼️ URL:', requestUrl);
        console.log('🖼️ Error Text:', errorText);
        console.log('🖼️ ===================');
        alert(`Gallery API failed (${response.status} ${response.statusText}).\nURL: ${requestUrl}\n${errorText.slice(0, 200)}`);
        // Fallback to placeholder images
        const placeholderImages = getPlaceholderImages(hotspotName);
        setGalleryImages(placeholderImages);
      }
    } catch (error) {
      alert(`Gallery API error: ${error instanceof Error ? error.message : String(error)}\nURL: ${typeof window !== 'undefined' ? `${window.location.origin}/api/gallery/${hotspotName.replace('Hotspot_geo_', '')}` : '/api/gallery'}`);
      // Use placeholder images if API fails
      const placeholderImages = getPlaceholderImages(hotspotName);
      setGalleryImages(placeholderImages);
    }
    
    setGalleryLoading(false);
    setGalleryVisible(true);
    // Disable scene mouse events when gallery opens
    disableSceneMouseEvents();
  };
  
  const getPlaceholderImages = (hotspotName: string): GalleryImage[] => {
    // Generate placeholder images based on hotspot category
    const category = HOTSPOT_CATEGORIES[hotspotName] || 'General';
    const baseImages: GalleryImage[] = [
      { thumb: '/images/featured/modern-home.png', full: '/images/featured/modern-home.png', caption: `${category} Project 1`, width: 1920, height: 1080 },
      { thumb: '/images/featured/boutique-store.png', full: '/images/featured/boutique-store.png', caption: `${category} Project 2`, width: 1920, height: 1080 },
      { thumb: '/images/featured/hotel-lobby.png', full: '/images/featured/hotel-lobby.png', caption: `${category} Project 3`, width: 1920, height: 1080 },
      { thumb: '/images/gallery/outdoor-patio.png', full: '/images/gallery/outdoor-patio.png', caption: `${category} Project 4`, width: 1920, height: 1080 },
      { thumb: '/images/gallery/restaurant-bar.png', full: '/images/gallery/restaurant-bar.png', caption: `${category} Project 5`, width: 1920, height: 1080 },
      { thumb: '/images/gallery/staircase.png', full: '/images/gallery/staircase.png', caption: `${category} Project 6`, width: 1920, height: 1080 },

    ];
    
    return baseImages;
  };
  const closeGallery = () => {
    console.log('🔧 closeGallery() called - Starting gallery cleanup...');
    console.log('  Current galleryVisible:', galleryVisible);
    console.log('  Current __galleryMode:', (window as any).__galleryMode);
    
    // Only handle gallery UI state - don't call continueJourney
    setGalleryVisible(false);
    setGalleryImages([]);
    setCurrentHotspot('');
    
    console.log('  ✅ Gallery state updated - galleryVisible set to false');
    
    // Restore scroll and click events after gallery closes
    restoreSceneEvents();
    
    console.log('🔧 closeGallery() completed');
  };

  const restoreSceneEvents = () => {
    console.log('✅ Restoring scene events and scrolling...');
    
    // Clear the gallery mode flag
    delete (window as any).__galleryMode;
    console.log('  ✅ __galleryMode flag removed');
    
    // CSS-ONLY RESTORATION: Restore original CSS values
    if (typeof document !== 'undefined') {
      console.log('🎨 Restoring original CSS scroll properties...');
      
      // Restore original values or use defaults
      const originalBodyOverflow = (window as any).__originalBodyOverflow || 'auto';
      const originalBodyTouchAction = (window as any).__originalBodyTouchAction || 'auto';
      const originalHtmlOverflow = (window as any).__originalHtmlOverflow || 'auto';
      const originalHtmlTouchAction = (window as any).__originalHtmlTouchAction || 'auto';
      
      // Restore body styles
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.touchAction = originalBodyTouchAction;
      
      // Restore HTML element styles
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.documentElement.style.touchAction = originalHtmlTouchAction;
      
      console.log('  ✅ CSS scroll properties restored');
      console.log('  📊 Body overflow:', document.body.style.overflow);
      console.log('  📊 Body touch-action:', document.body.style.touchAction);
      console.log('  📊 HTML overflow:', document.documentElement.style.overflow);
      console.log('  📊 HTML touch-action:', document.documentElement.style.touchAction);
      
      // Clean up stored values
      delete (window as any).__originalBodyOverflow;
      delete (window as any).__originalBodyTouchAction;
      delete (window as any).__originalHtmlOverflow;
      delete (window as any).__originalHtmlTouchAction;
    }
    
    // CRITICAL: Trigger event listener re-registration by dispatching a custom event
    // This ensures hotspot highlighting works immediately after gallery closes
    console.log('  🎯 Dispatching gallery-closed event to re-enable hotspot listeners');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gallery-closed'));
    }
    
    console.log('✅ Scene events restored - scrolling and hotspots should work normally');
  };
  const onReturnToMainPath = () => {
    console.log('🔄 Return to Main Path initiated...');
    console.log('  Current state - galleryVisible:', galleryVisible);
    console.log('  Current state - __galleryMode:', (window as any).__galleryMode);
    
    // Step 1: Close gallery (UI state management)
    console.log('1️⃣ Closing gallery...');
    closeGallery();
    
    // Step 2: Wait for state update, then continue journey
    console.log('2️⃣ Waiting for gallery state to update...');
    setTimeout(() => {
      console.log('3️⃣ Gallery state should be updated now, continuing journey...');
      console.log('  Current galleryVisible:', galleryVisible);
      console.log('  Current __galleryMode:', (window as any).__galleryMode);
      continueJourney();
    }, 100); // Wait 100ms for React state to update
  };

  const disableSceneMouseEvents = () => {
    console.log('🚫 Disabling scene mouse events - Gallery is visible');
    
    // Track event for debug panel
    (window as any).__lastEventTime = Date.now();
    (window as any).__lastEventType = 'disableSceneMouseEvents';
    
    (window as any).__galleryMode = true; // Set flag
    
    // CSS-ONLY APPROACH: Block scrolling using CSS instead of JavaScript
    if (typeof document !== 'undefined') {
      console.log('🎨 Using CSS-only scroll blocking...');
      
      // Store original values
      (window as any).__originalBodyOverflow = document.body.style.overflow;
      (window as any).__originalBodyTouchAction = document.body.style.touchAction;
      (window as any).__originalHtmlOverflow = document.documentElement.style.overflow;
      (window as any).__originalHtmlTouchAction = document.documentElement.style.touchAction;
      
      // Block scrolling with CSS
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.touchAction = 'none';
      
      console.log('  ✅ CSS scroll blocking applied');
      console.log('  📊 Original values stored for restoration');
    }
    
    // Force clear any existing hotspot state
    if (hoveredHotspot) {
      setHoveredHotspot(null);
      setHoverTooltip((prev: any) => ({ ...prev, visible: false }));
      console.log('  🧹 Forced cleanup of existing hotspot state');
    }
  };
  const enableSceneMouseEvents = () => {
    console.log('✅ Re-enabling scene mouse events - Gallery is closed');
    
    // Track event for debug panel
    (window as any).__lastEventTime = Date.now();
    (window as any).__lastEventType = 'enableSceneMouseEvents';
    
    // Clear the gallery mode flag FIRST
    delete (window as any).__galleryMode;
    console.log('  ✅ __galleryMode flag removed');
    
    // AGGRESSIVE CLEANUP: Remove ALL scroll prevention listeners
    console.log('  🧹 Aggressive cleanup of scroll prevention listeners...');
    
    // Remove wheel listener
    if ((window as any).__wheelListener) {
      console.log('    Removing wheel listener:', (window as any).__wheelListener);
      console.log('    Listener function type:', typeof (window as any).__wheelListener);
      console.log('    Listener function toString:', (window as any).__wheelListener.toString().substring(0, 100));
      
      // Try multiple removal strategies
      try {
        window.removeEventListener('wheel', (window as any).__wheelListener, { capture: true });
        console.log('      ✅ Removed with capture: true');
      } catch (e) {
        console.log('      ❌ Failed to remove with capture: true:', e);
      }
      
      try {
        window.removeEventListener('wheel', (window as any).__wheelListener, { capture: false });
        console.log('      ✅ Removed with capture: false');
      } catch (e) {
        console.log('      ❌ Failed to remove with capture: false:', e);
      }
      
      try {
        window.removeEventListener('wheel', (window as any).__wheelListener);
        console.log('      ✅ Removed without capture option');
      } catch (e) {
        console.log('      ❌ Failed to remove without capture option:', e);
      }
      
      delete (window as any).__wheelListener;
      console.log('    ✅ Wheel listener removed (all strategies)');
      
      // Verify the listener is actually gone
      if ((window as any).__wheelListener) {
        console.log('    ⚠️ WARNING: __wheelListener still exists after deletion!');
      } else {
        console.log('    ✅ __wheelListener successfully deleted');
      }
    } else {
      console.log('    ℹ️ No wheel listener to remove');
    }
    
    // Remove touchmove listener
    if ((window as any).__touchmoveListener) {
      console.log('    Removing touchmove listener:', (window as any).__touchmoveListener);
      // Try multiple removal strategies
      window.removeEventListener('touchmove', (window as any).__touchmoveListener, { capture: true });
      window.removeEventListener('touchmove', (window as any).__touchmoveListener, { capture: false });
      window.removeEventListener('touchmove', (window as any).__touchmoveListener);
      delete (window as any).__touchmoveListener;
      console.log('    ✅ Touchmove listener removed (all strategies)');
    }
    
    // Remove keydown listener
    if ((window as any).__keydownListener) {
      console.log('    Removing keydown listener:', (window as any).__keydownListener);
      // Try multiple removal strategies
      window.removeEventListener('keydown', (window as any).__keydownListener, { capture: true });
      window.removeEventListener('keydown', (window as any).__keydownListener, { capture: false });
      window.removeEventListener('keydown', (window as any).__keydownListener);
      delete (window as any).__keydownListener;
      console.log('    ✅ Keydown listener removed (all strategies)');
    }
    
    console.log('✅ All scroll prevention listeners removed');
    
    // NUCLEAR CLEANUP: Remove ALL wheel listeners using global tracker
    if ((window as any).__globalWheelTracker) {
      console.log('🚨 NUCLEAR CLEANUP: Removing ALL tracked wheel listeners...');
      const tracker = (window as any).__globalWheelTracker;
      
      console.log(`  🔍 Found ${tracker.wheelListeners.size} wheel listeners to remove:`);
      
      // Remove all tracked wheel listeners
      for (const item of tracker.wheelListeners) {
        console.log('    Removing tracked wheel listener:', item.listener);
        console.log('      Options:', item.options);
        
        try {
          if (item.options) {
            tracker.originalRemoveEventListener.call(window, 'wheel', item.listener, item.options);
            console.log('      ✅ Removed with original options');
          } else {
            tracker.originalRemoveEventListener.call(window, 'wheel', item.listener);
            console.log('      ✅ Removed without options');
          }
        } catch (e) {
          console.log('      ❌ Failed to remove:', e);
        }
      }
      
      // Clear the tracking set
      tracker.wheelListeners.clear();
      console.log('    ✅ All tracked wheel listeners removed');
      
      // Restore original methods
      window.addEventListener = tracker.originalAddEventListener;
      window.removeEventListener = tracker.originalRemoveEventListener;
      
      // Clean up tracker
      delete (window as any).__globalWheelTracker;
      console.log('    ✅ Global tracker cleaned up');
    }
    
    // Verify that all flags are cleared
    console.log('🔍 Final verification - All flags cleared:');
    console.log('  __galleryMode:', (window as any).__galleryMode);
    console.log('  __wheelListener:', (window as any).__wheelListener);
    console.log('  __touchmoveListener:', (window as any).__touchmoveListener);
    console.log('  __keydownListener:', (window as any).__keydownListener);
    
    // Simple test to see if there are any remaining wheel listeners
    console.log('🔍 Simple test for remaining wheel listeners...');
    const testWheelEvent3 = new WheelEvent('wheel', { deltaY: 100 });
    let wasBlocked = false;
    
    // Create a temporary listener to detect if any wheel events are being blocked
    const tempListener3 = (e: Event) => {
      if (e.defaultPrevented) {
        wasBlocked = true;
        console.log('⚠️ WARNING: Wheel event is still being blocked!');
        console.log('  This means there is another wheel listener we did not remove.');
      }
    };
    
    window.addEventListener('wheel', tempListener3, { once: true });
    window.dispatchEvent(testWheelEvent3);
    
    setTimeout(() => {
      if (wasBlocked) {
        console.log('🚨 PROBLEM IDENTIFIED: Wheel events are still being blocked');
        console.log('  Our cleanup removed our listeners, but another listener remains');
        console.log('  This listener is NOT one we created, so we cannot remove it');
      } else {
        console.log('✅ SUCCESS: No wheel blocking detected after cleanup');
      }
      window.removeEventListener('wheel', tempListener3);
    }, 50);
    
    // Test if there are any remaining wheel listeners
    console.log('🔍 Testing for remaining wheel listeners...');
    const testWheelEvent1 = new WheelEvent('wheel', { deltaY: 100 });
    let remainingListeners = 0;
    
    // Create a temporary listener to count how many times the event is processed
    const tempListener1 = (e: Event) => {
      remainingListeners++;
      console.log(`    📊 Wheel event processed by listener ${remainingListeners}`);
    };
    
    window.addEventListener('wheel', tempListener1, { once: true });
    window.dispatchEvent(testWheelEvent1);
    
    setTimeout(() => {
      if (remainingListeners > 0) {
        console.log(`⚠️ WARNING: ${remainingListeners} wheel listeners are still active!`);
        console.log('  This means our cleanup did not work properly.');
      } else {
        console.log('✅ No remaining wheel listeners detected');
      }
      window.removeEventListener('wheel', tempListener1);
    }, 50);
    
    // NUCLEAR OPTION: If normal cleanup fails, try to detect and remove any remaining listeners
    setTimeout(() => {
      console.log('🧪 Testing if cleanup was successful...');
      const testWheelEvent2 = new WheelEvent('wheel', { deltaY: 100 });
      let wasBlocked = false;
      
      // Create a temporary listener to detect if our blocking is still active
      const tempListener2 = (e: Event) => {
        if (e.defaultPrevented) {
          wasBlocked = true;
          console.log('⚠️ WARNING: Scroll is still being blocked!');
        }
      };
      
      window.addEventListener('wheel', tempListener2, { once: true });
      window.dispatchEvent(testWheelEvent2);
      
      setTimeout(() => {
        if (wasBlocked) {
          console.log('🚨 NUCLEAR CLEANUP NEEDED: Scroll still blocked after normal cleanup');
          console.log('  Attempting to remove all wheel listeners...');
          // This is a last resort - try to remove all wheel listeners
          window.removeEventListener('wheel', tempListener2);
        } else {
          console.log('✅ Scroll cleanup successful - no blocking detected');
        }
      }, 50);
    }, 100);
    
    // Verify that listeners are actually removed
    console.log('🔍 Verifying listener removal:');
    console.log('  __wheelListener:', (window as any).__wheelListener);
    console.log('  __touchmoveListener:', (window as any).__touchmoveListener);
    console.log('  __keydownListener:', (window as any).__keydownListener);
    
    // Test that hotspot detection is working again
    console.log('🧪 Testing hotspot detection restoration...');
    console.log('  Current hoveredHotspot:', hoveredHotspot);
    console.log('  Current hoverTooltip visible:', hoverTooltip.visible);
    
    // Test scroll restoration
    console.log('🧪 Testing scroll restoration...');
    const testWheelEvent = new WheelEvent('wheel', { deltaY: 100 });
    console.log('  Dispatching test wheel event...');
    console.log('  If you see 🚫 BLOCKING WHEEL SCROLL below, listeners are still active!');
    window.dispatchEvent(testWheelEvent);
    
    // Force a test to ensure the original listeners are working
    setTimeout(() => {
      console.log('🧪 Testing event listener restoration...');
      // Simulate a mouse move to test if hotspot detection is working
      const testEvent = new MouseEvent('mousemove', {
        clientX: 100,
        clientY: 100
      });
      console.log('  Dispatching test mousemove event...');
      window.dispatchEvent(testEvent);
    }, 100);
  };

  const addPathVisuals = (curve: THREE.CatmullRomCurve3) => {
    if (!sceneRef.current) return;
    
    // MEMORY LEAK PREVENTION: Only log when actually adding visuals
    const trace = new Error().stack?.split('\n')[2] || 'unknown'
    console.log('🎨 [addPathVisuals] Called from:', trace.trim());
    console.log('🎨 [addPathVisuals] Adding path visuals, SHOW_CAMERA_PATH:', SHOW_CAMERA_PATH, 'SHOW_WAYPOINTS:', SHOW_WAYPOINTS);
    removePathVisuals();
    if (SHOW_CAMERA_PATH) {
      const pts = curve.getPoints(300);
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color: 0xff0000 });
      const line = new THREE.Line(geom, mat);
      line.renderOrder = 999;
      sceneRef.current.add(line);
      pathLineRef.current = line;
      console.log('🎨 [addPathVisuals] Camera path line added to scene');
    }
    if (SHOW_WAYPOINTS) {
      const group = new THREE.Group();
      const sphereGeom = new THREE.SphereGeometry(0.2, 12, 12);
      const sphereMat = new THREE.MeshBasicMaterial({ color: 0xff00aa });
      gsapCameraPoints.forEach((p) => {
        const m = new THREE.Mesh(sphereGeom.clone(), sphereMat);
        m.position.copy(p);
        group.add(m);
      });
      sceneRef.current.add(group);
      waypointGroupRef.current = group;
      console.log('🎨 [addPathVisuals] Waypoint spheres added to scene:', gsapCameraPoints.length, 'points');
    }
  };


  // Store the current camera position for continuous path calculation
  // This ensures we always continue from where we are, not return to initial position
  const currentCameraPositionRef = useRef<THREE.Vector3>(new THREE.Vector3());
  
  // STATE MACHINE: Track camera positions for proper journey management
  const cameraStateRef = useRef<{
    isOnMainPath: boolean;
    mainPathPosition: THREE.Vector3;
    lastHotspotPosition: THREE.Vector3 | null;
    journeyStartPosition: THREE.Vector3;
    currentJourneyStart: THREE.Vector3;
    savedSplineProgress: number; // Save spline progress t value when leaving main tour
    exactSplinePosition: THREE.Vector3 | null; // Exact position on spline for verification
    savedLookAtTarget: THREE.Vector3 | null; // Exact lookAt target when leaving main path
  }>({
    isOnMainPath: true,
    mainPathPosition: INTRO_END_POS.clone(), // Real starting position from your observation
    lastHotspotPosition: null,
    journeyStartPosition: INTRO_END_POS.clone(),
    currentJourneyStart: INTRO_END_POS.clone(),
    savedSplineProgress: 0, // Starts at main path
    exactSplinePosition: null,
    savedLookAtTarget: null
  });

  // NEW: Real-time camera position tracking for focused area panel
  const [realTimeCameraPosition, setRealTimeCameraPosition] = useState<THREE.Vector3>(INTRO_END_POS.clone());
  
  // Hotspot hover tooltip state
  const [hoverTooltip, setHoverTooltip] = useState<{
    visible: boolean;
    text: string;
    position: { x: number; y: number };
  }>({
    visible: false,
    text: '',
    position: { x: 0, y: 0 }
  });

  // Hotspot pulse markers refs and state
  const hotspotPulseRefs = useRef<THREE.Mesh[]>([]);
  const pulseAnimationRef = useRef<number>();
  const pulseMarkersCreatedRef = useRef<boolean>(false);
  const animatingMarkersRef = useRef<Set<number>>(new Set()); // Track which markers are currently animating
  const currentlyHoveredMarkerRef = useRef<number | null>(null); // Track which marker is currently being hovered

  // Function to create purple pulsing spheres for hotspots
  const createHotspotPulseMarkers = () => {
    if (!sceneRef.current || !clickableObjectsRef.current.length) return;
    
    // Check if pulse markers have already been created to prevent duplicates
    if (pulseMarkersCreatedRef.current) {
      console.log('🎯 Pulse markers already created, skipping creation');
      return;
    }
    
    // Check if pulse markers already exist in scene to prevent duplicates
    const existingPulseGroup = sceneRef.current.getObjectByName('hotspotPulseMarkers') as THREE.Group | null;
    if (existingPulseGroup) {
      console.log('🎯 Pulse markers already exist in scene, skipping creation');
      return;
    }
    
    console.log('🎯 Creating hotspot pulse markers for mobile...');
    
    // Remove any existing pulse markers if they exist (safety check)
    const existingPulseGroup2 = sceneRef.current.getObjectByName('hotspotPulseMarkers') as THREE.Group | null;
    if (existingPulseGroup2) {
      sceneRef.current.remove(existingPulseGroup2);
      existingPulseGroup2.children.forEach((child: THREE.Object3D) => {
        if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
        if ((child as THREE.Mesh).material) {
          const material = (child as THREE.Mesh).material;
          if (Array.isArray(material)) {
            material.forEach(mat => mat.dispose());
          } else {
            material.dispose();
          }
        }
      });
    }
    
    // Create a group to hold all pulse markers
    const pulseGroup = new THREE.Group();
    pulseGroup.name = 'hotspotPulseMarkers';
    
    // Create pulse markers for each hotspot
    clickableObjectsRef.current.forEach((hotspot, index) => {
      const hotspotPosition = new THREE.Vector3();
      hotspot.getWorldPosition(hotspotPosition);
      
      // Create the main pulse sphere - inner dot fully visible on mobile
      const pulseGeometry = new THREE.SphereGeometry(0.5, 16, 16); // Small inner dot
      const pulseMaterial = new THREE.MeshBasicMaterial({
        color: PULSE_MARKER_COLOR, // Use constant for inner dot color
        transparent: true,
        opacity: 1 // Full opacity for better mobile visibility
      });
      
      const pulseSphere = new THREE.Mesh(pulseGeometry, pulseMaterial);
      pulseSphere.position.copy(hotspotPosition);
      pulseSphere.position.y += 0.5; // Slightly above the hotspot
      pulseSphere.name = `pulse_${hotspot.name}`;
      pulseSphere.userData.hotspotName = hotspot.name;
      pulseSphere.userData.isPulseMarker = true; // Mark as pulse marker for cursor handling
      
      // Fix layering: Enable depth testing and set proper render order
      pulseSphere.renderOrder = 1000; // High render order to appear on top
      pulseSphere.frustumCulled = false; // Ensure visibility
      
      // Create outer ring that will scale/fade on hover - proper ring geometry
      const ringGeometry = new THREE.RingGeometry(0.2, 0.4, 16); // Inner radius 0.2, outer radius 0.4
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: PULSE_RING_COLOR, // Use constant for ring color
        transparent: true,
        opacity: 0, // hidden until hover
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
      ringMesh.position.copy(pulseSphere.position);
      ringMesh.renderOrder = 1001; // Even higher render order for ring
      ringMesh.frustumCulled = false; // Ensure visibility
      
      // Make ring face the camera (billboard effect)
      {
        const cam = cameraRef.current;
        if (cam) {
          ringMesh.lookAt(cam.position);
        }
      }
      
      // Add both spheres to the group
      pulseGroup.add(pulseSphere);
      pulseGroup.add(ringMesh);
      
      // Store references for animation
      hotspotPulseRefs.current[index * 2] = pulseSphere;
      hotspotPulseRefs.current[index * 2 + 1] = ringMesh;
      
      // Store pulse sphere reference for click handling (but don't add to main clickable objects)
      // This prevents conflicts with hover detection while maintaining clickability
      
      console.log(`🎯 Created pulse marker for ${hotspot.name} at position:`, hotspotPosition);
    });
    
    // Add the pulse group to the scene
    sceneRef.current.add(pulseGroup);
    
    // Mark as created to prevent duplicates
    pulseMarkersCreatedRef.current = true;
    
    console.log(`✅ Created ${hotspotPulseRefs.current.length / 2} pulse markers for mobile`);
    console.log('Pulse group added to scene:', pulseGroup);
    
    // Add cursor pointer CSS to the document for pulse markers
    // addPulseMarkerCursorStyles();
  };

  // Function to show marker on hover (animate outer ring only, keep inner dot visible)
  const showMarkerOnHover = (markerIndex: number) => {
    // Check if this marker is already animating
    if (animatingMarkersRef.current.has(markerIndex)) {
      console.log(`🎯 Marker ${markerIndex} is already animating, skipping new animation`);
      return;
    }

    // Check if we're still hovering the same marker
    if (currentlyHoveredMarkerRef.current === markerIndex) {
      console.log(`🎯 Still hovering marker ${markerIndex}, skipping new animation`);
      return;
    }

    // Update the currently hovered marker
    currentlyHoveredMarkerRef.current = markerIndex;

    // Show corresponding marker panel (only if in scroll range)
    if ((window as any).showMarkerPanel) {
      (window as any).showMarkerPanel(markerIndex);
    }

    const pulseSphere = hotspotPulseRefs.current[markerIndex * 2];
    const ringMesh = hotspotPulseRefs.current[markerIndex * 2 + 1];
    
    if (pulseSphere && pulseSphere.material) {
      const pulseMaterial = pulseSphere.material as THREE.MeshBasicMaterial;
      pulseMaterial.opacity = 0.9; // ensure inner remains semi-transparent
    }
    
    if (ringMesh && ringMesh.material) {
      const ringMaterial = ringMesh.material as THREE.MeshBasicMaterial;
      ringMaterial.opacity = 0.8; // show ring with higher opacity
      
      // Reset ring scale
      ringMesh.scale.set(1, 1, 1);
      
      // Update ring to face camera
      {
        const cam = cameraRef.current;
        if (cam) {
          ringMesh.lookAt(cam.position);
        }
      }
      
      // Mark this marker as animating
      animatingMarkersRef.current.add(markerIndex);
      
      // Trigger brief scale-out/fade-out animation
      const start = performance.now();
      const duration = 800; // Slightly longer animation
      const initialScale = 1;
      const targetScale = 1.5; // Scale to 150% for better visibility
      
      const animate = () => {
        const now = performance.now();
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
        
        const s = initialScale + (targetScale - initialScale) * eased;
        ringMesh.scale.set(s, s, s);
        ringMaterial.opacity = 0.8 * (1 - eased);
        
        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          // Hide ring after animation and mark as no longer animating
          ringMaterial.opacity = 0;
          animatingMarkersRef.current.delete(markerIndex);
          console.log(`🎯 Animation completed for marker ${markerIndex}`);
        }
      };
      requestAnimationFrame(animate);
    }
  };

  // Function to hide all markers (hide rings only, keep inner visible)
  const hideAllMarkers = () => {
    // Clear all animating markers when hiding all
    animatingMarkersRef.current.clear();
    // Clear currently hovered marker
    currentlyHoveredMarkerRef.current = null;
    
    // Hide all marker panels (let GSAP handle scroll-based visibility)
    if ((window as any).hideAllMarkerPanels) {
      (window as any).hideAllMarkerPanels();
    }
    
    hotspotPulseRefs.current.forEach((marker, i) => {
      if (marker && marker.material) {
        const material = marker.material as THREE.MeshBasicMaterial;
        if (i % 2 === 0) {
          // inner dot - keep visible
          material.opacity = 0.9; // Semi-transparent inner dot
        } else {
          // outer ring - hide and reset scale
          material.opacity = 0;
          marker.scale.set(1, 1, 1); // Reset scale
          // Update ring to face camera
          {
            const cam = cameraRef.current;
            if (cam) {
              marker.lookAt(cam.position);
            }
          }
        }
      }
    });
  };

  // Function to animate a single hotspot marker
  const animateSingleHotspotPulse = (markerIndex: number) => {
    const pulseSphere = hotspotPulseRefs.current[markerIndex * 2];
    const glowSphere = hotspotPulseRefs.current[markerIndex * 2 + 1];
    
    if (!pulseSphere || !glowSphere || !pulseSphere.material || !glowSphere.material) {
      console.log(`🎯 Marker ${markerIndex} not found for animation`);
      return;
    }
    
    const startTime = performance.now();
    const pulseDuration = 2000; // Brief 2-second pulse
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      
      if (elapsed > pulseDuration) {
        // Stop animation after brief duration
        console.log(`🎯 Brief pulse animation completed for marker ${markerIndex}`);
        return;
      }
      
      const time = elapsed * 0.001;
      
      // Animate pulse sphere
      const pulseMaterial = pulseSphere.material as THREE.MeshBasicMaterial;
      const pulseSpeed = 6.0;
      const pulse = Math.sin(time * pulseSpeed) * 0.5 + 0.5;
      pulseMaterial.opacity = 0.9 * pulse;
      pulseMaterial.color.setHex(PULSE_MARKER_COLOR);
      const scale = 0.7 + Math.sin(time * 6.0) * 0.3;
      pulseSphere.scale.setScalar(scale);
      
      // Animate glow sphere
      const glowMaterial = glowSphere.material as THREE.MeshBasicMaterial;
      const glowSpeed = 4.0;
      const glow = Math.sin(time * glowSpeed) * 0.5 + 0.5;
      glowMaterial.opacity = 0.6 * glow;
      glowMaterial.color.setHex(PULSE_RING_COLOR);
      
      // Continue animation
      requestAnimationFrame(animate);
    };
    
    animate();
  };
  // Function to animate the pulse markers with brief, swift pulses
  const animateHotspotPulses = () => {
    if (!hotspotPulseRefs.current.length) {
      console.log('🎯 No pulse markers to animate');
      return;
    }
    
    const startTime = performance.now();
    const pulseDuration = 2000; // Brief 2-second pulse
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      
      if (elapsed > pulseDuration) {
        // Stop animation after brief duration
        console.log('🎯 Brief pulse animation completed');
        return;
      }
      
      const time = elapsed * 0.001;
      
      hotspotPulseRefs.current.forEach((pulseMesh, index) => {
        if (!pulseMesh || !pulseMesh.material) return;
        
        const material = pulseMesh.material as THREE.MeshBasicMaterial;
        
        // Brief, swift pulse with higher frequency
        const pulseSpeed = index % 2 === 0 ? 6.0 : 4.0; // Very fast pulse
        const pulse = Math.sin(time * pulseSpeed) * 0.5 + 0.5; // Range from 0.0 to 1.0 (more dramatic)
        
        // Base opacity
        const baseOpacity = index % 2 === 0 ? 0.9 : 0.6;
        material.opacity = baseOpacity * pulse;
        
        // Ensure color uses the appropriate constant
        material.color.setHex(index % 2 === 0 ? PULSE_MARKER_COLOR : PULSE_RING_COLOR);
        
        // Swift scaling for main spheres
        if (index % 2 === 0) {
          const scale = 0.7 + Math.sin(time * 6.0) * 0.3; // Very fast, dramatic scaling
          pulseMesh.scale.setScalar(scale);
        }
      });
      
      // Continue animation
      pulseAnimationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
  };

  // Function to stop pulse animation
  const stopPulseAnimation = () => {
    if (pulseAnimationRef.current) {
      cancelAnimationFrame(pulseAnimationRef.current);
      pulseAnimationRef.current = undefined;
    }
  };
  // Function to cleanup pulse markers
  const cleanupPulseMarkers = () => {
    if (sceneRef.current) {
          const existingPulseGroup = sceneRef.current.getObjectByName('hotspotPulseMarkers') as THREE.Group | null;
    if (existingPulseGroup) {
      sceneRef.current.remove(existingPulseGroup);
              existingPulseGroup.children.forEach((child: THREE.Object3D) => {
          if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
          if ((child as THREE.Mesh).material) {
            const material = (child as THREE.Mesh).material;
            if (Array.isArray(material)) {
              material.forEach(mat => mat.dispose());
            } else {
              material.dispose();
            }
          }
        });
    }
    }
    pulseMarkersCreatedRef.current = false;
    hotspotPulseRefs.current = [];
    
    // Stop animation
    stopPulseAnimation();
    
    // Clear the animation check interval
    if ((window as any).__pulseAnimationCheckInterval) {
      clearInterval((window as any).__pulseAnimationCheckInterval);
      delete (window as any).__pulseAnimationCheckInterval;
    }
    
    // Reset cursor to default
    if (document.body) {
      document.body.style.cursor = 'default';
    }
    
    // Remove cursor styles
    const cursorStyles = document.getElementById('pulse-marker-cursor-styles');
    if (cursorStyles) {
      cursorStyles.remove();
      console.log('🎯 Removed pulse marker cursor styles');
    }
  };

  // Debug function to log pulse marker status (commented out to reduce console spam)
  const debugPulseMarkers = () => {
    // Commented out to reduce console spam - uncomment for debugging
    /*
    if (sceneRef.current) {
      const pulseGroup = sceneRef.current.getObjectByName('hotspotPulseMarkers');
      console.log('🔍 PULSE MARKERS DEBUG:', {
        pulseGroupExists: !!pulseGroup,
        pulseGroupVisible: pulseGroup?.visible,
        pulseGroupChildren: pulseGroup?.children?.length || 0,
        pulseRefsLength: hotspotPulseRefs.current.length,
        pulseMarkersCreated: pulseMarkersCreatedRef.current,
        clickableObjectsLength: clickableObjectsRef.current.length
      });
      
      if (pulseGroup) {
        pulseGroup.children.forEach((child: THREE.Object3D, index: number) => {
          console.log(`  Pulse ${index}:`, {
            name: child.name,
            visible: child.visible,
            material: !!(child as THREE.Mesh).material,
            opacity: (child as any).material?.opacity
          });
        });
      }
    }
    */
  };
  // Function to add cursor pointer styles for hotspots and pulse markers
  const addPulseMarkerCursorStyles = () => {
    // Check if styles already exist
    if (document.getElementById('pulse-marker-cursor-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'pulse-marker-cursor-styles';
    style.textContent = `
      /* Hotspot and pulse marker cursor styles */
      .hotspot-hover {
        cursor: pointer !important;
      }
      
      .pulse-marker-hover {
        cursor: pointer !important;
      }
      
      /* Add pointer cursor when hovering over interactive elements */
      canvas:hover {
        cursor: pointer;
      }
      
      /* Ensure pointer cursor for all interactive 3D elements */
      .interactive-3d-element {
        cursor: pointer !important;
      }
    `;
    
    document.head.appendChild(style);
    console.log('🎯 Added hotspot and pulse marker cursor styles');
  };

  // Function to ensure pulse markers are visible
  const ensurePulseMarkersVisible = () => {
    if (sceneRef.current && hotspotPulseRefs.current.length > 0) {
      const pulseGroup = sceneRef.current.getObjectByName('hotspotPulseMarkers');
      if (pulseGroup) {
        // Debug: Log pulse marker visibility status (commented out to reduce spam)
        if (!pulseGroup.visible) {
          // console.log('🔍 Pulse markers were hidden, restoring visibility');
        }
        
        pulseGroup.visible = true;
        pulseGroup.children.forEach((child: THREE.Object3D, index: number) => {
          if (!child.visible) {
            // console.log(`🔍 Pulse marker ${index} was hidden, restoring visibility`);
          }
          
          child.visible = true;
          if ((child as any).material) {
            (child as any).material.transparent = true;
            // Don't reset opacity here - let animation control it
            // (child as any).material.opacity = index % 2 === 0 ? 0.6 : 0.3;
          }
        });
        
        // Force the pulse group to be visible and in the scene
        if (!sceneRef.current.children.includes(pulseGroup)) {
          // console.log('🔍 Pulse group was removed from scene, re-adding');
          sceneRef.current.add(pulseGroup);
        }
      } else {
        // console.log('🔍 Pulse group not found in scene, pulse markers may have been removed');
        // If pulse group is completely missing, recreate it
        if (clickableObjectsRef.current.length > 0 && !pulseMarkersCreatedRef.current) {
          // console.log('🔍 Recreating missing pulse markers');
          createHotspotPulseMarkers();
                 } else if (pulseMarkersCreatedRef.current && sceneRef.current) {
           // If markers exist but animation might have stopped, restart it
           const pulseGroup = sceneRef.current.getObjectByName('hotspotPulseMarkers');
           if (pulseGroup && !pulseAnimationRef.current) {
             console.log('🔍 Restarting pulse animation');
             animateHotspotPulses();
           }
         }
      }
    }
  };

  // Debug: Monitor galleryVisible state changes
  useEffect(() => {
    console.log('🔍 Gallery visibility state changed:', galleryVisible);
    console.log('  Current __galleryMode:', (window as any).__galleryMode);
    console.log('  Current hoveredHotspot:', hoveredHotspot);
  }, [galleryVisible]);
  
  // Add a ref to track gallery state immediately (bypasses React state update delay)
  const galleryVisibleRef = useRef(false);
  
  // Update ref whenever galleryVisible changes
  useEffect(() => {
    galleryVisibleRef.current = galleryVisible;
    console.log('🔍 Gallery ref updated:', galleryVisibleRef.current);
  }, [galleryVisible]);
  
  // Update real-time camera position every frame when focused
  useEffect(() => {
    if (!isFocusedOnHotspot) return;
    
    const updatePosition = () => {
      if (cameraRef.current) {
        setRealTimeCameraPosition(cameraRef.current.position.clone());
      }
    };
    
    const interval = setInterval(updatePosition, 16); // 60fps updates
    return () => clearInterval(interval);
  }, [isFocusedOnHotspot]);

  // Update tooltip position during mouse move
  useEffect(() => {
    if (!hoverTooltip.visible) return;
    
    const handleMouseMove = (event: MouseEvent) => {
      setHoverTooltip((prev: any) => ({
        ...prev,
        position: { x: event.clientX, y: event.clientY }
      }));
    };
    
    console.log('🎧 [EVENT LISTENER] Registered: mousemove (handleMouseMove for hotspots)');
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      console.log('🔌 [EVENT LISTENER] Removed: mousemove (handleMouseMove)');
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [hoverTooltip.visible]);
  


  // Function to move camera to hotspot with ENHANCED smooth fly-in path
  // Features:
  // 1. Beautiful bezier curve with slight detour for visual appeal
  // 2. Camera view maintained at end of animation
  // 3. Continuous path calculation from current position to new hotspots
  const moveCameraToHotspot = (hotspot: THREE.Object3D) => {
    if (!cameraRef.current || !sceneRef.current || !rendererRef.current) return;
    
    const camera = cameraRef.current;
    
    // 1. Find hotspot world position - THIS IS THE KEY!
    const target = new THREE.Vector3();
    hotspot.getWorldPosition(target);
    
    // Log initial camera state once when animation starts
    console.log('🔍 INITIAL CAMERA STATE:', {
      isOnMainPath: cameraStateRef.current.isOnMainPath,
      mainPathPosition: cameraStateRef.current.mainPathPosition,
      journeyStartPosition: cameraStateRef.current.journeyStartPosition
    });
    
    // CRITICAL: Save the current spline progress t value when leaving the main tour
    // This ensures we return to the exact same point on the spline
    if (cameraStateRef.current.isOnMainPath && introCompletedRef.current) {
      // Store the current spline progress for return journey with high precision
      cameraStateRef.current.savedSplineProgress = parseFloat(pathProgressRef.current.t.toFixed(6));
      
      // ALSO save the exact camera position at this spline point for verification
      if (gsapCurveRef.current) {
        const exactSplinePosition = gsapCurveRef.current.getPointAt(cameraStateRef.current.savedSplineProgress);
        cameraStateRef.current.exactSplinePosition = exactSplinePosition.clone();
        console.log('💾 SAVED EXACT SPLINE POSITION:', exactSplinePosition);
      }
      
      // CRITICAL: Save the current lookAt target for smooth return animation
      // Method 1: Try to get the current camera's lookAt target
      // Get the camera's forward direction and calculate where it's looking
      const currentLookAtTarget = new THREE.Vector3();
      camera.getWorldDirection(currentLookAtTarget);
      
      // Calculate a point 10 units in front of the camera (where it's looking)
      const lookDistance = 10;
      currentLookAtTarget.multiplyScalar(lookDistance).add(camera.position);
      
      console.log('💾 DEBUG: Camera forward direction:', camera.getWorldDirection(new THREE.Vector3()));
      console.log('💾 DEBUG: Camera position:', camera.position);
      console.log('💾 DEBUG: Calculated lookAt target:', currentLookAtTarget);
      
      // Method 2: If we have gsapLookAtTargets, try to get the closest one
      let splineLookAtTarget: THREE.Vector3 | null = null;
      console.log('💾 DEBUG: gsapLookAtTargetsRef.current exists:', !!gsapLookAtTargetsRef.current);
      if (gsapLookAtTargetsRef.current) {
        console.log('💾 DEBUG: gsapLookAtTargetsRef.current length:', gsapLookAtTargetsRef.current.length);
        console.log('💾 DEBUG: gsapLookAtTargetsRef.current contents:', gsapLookAtTargetsRef.current);
      }
      
      if (gsapLookAtTargetsRef.current && cameraStateRef.current.savedSplineProgress !== undefined) {
        const lookAtIndex = Math.floor(cameraStateRef.current.savedSplineProgress * (gsapLookAtTargetsRef.current.length - 1));
        splineLookAtTarget = gsapLookAtTargetsRef.current[Math.max(0, Math.min(lookAtIndex, gsapLookAtTargetsRef.current.length - 1))];
        console.log('💾 SPLINE LOOKAT TARGET:', splineLookAtTarget);
        console.log('💾 LOOKAT INDEX:', lookAtIndex, 'of', gsapLookAtTargetsRef.current.length);
      }
      
      // Method 3: Fallback to cube center if available
      const fallbackLookAtTarget = cubePos.current ? cubePos.current.clone() : null;
      
      // Choose the best lookAt target: current camera direction > spline > fallback
      // Also check that the lookAt target is not too close to the camera
      const minLookAtDistance = 2; // Minimum distance for lookAt target
      const distanceToLookAt = currentLookAtTarget.distanceTo(camera.position);
      
      if (currentLookAtTarget && distanceToLookAt > minLookAtDistance) {
        cameraStateRef.current.savedLookAtTarget = currentLookAtTarget.clone();
        console.log('💾 SAVED CURRENT CAMERA LOOKAT TARGET:', currentLookAtTarget);
        console.log('💾 Distance to lookAt target:', distanceToLookAt.toFixed(2));
      } else if (splineLookAtTarget && splineLookAtTarget.distanceTo(camera.position) > minLookAtDistance) {
        cameraStateRef.current.savedLookAtTarget = splineLookAtTarget.clone();
        console.log('💾 SAVED SPLINE LOOKAT TARGET:', splineLookAtTarget);
      } else if (fallbackLookAtTarget && fallbackLookAtTarget.distanceTo(camera.position) > minLookAtDistance) {
        cameraStateRef.current.savedLookAtTarget = fallbackLookAtTarget.clone();
        console.log('💾 SAVED FALLBACK LOOKAT TARGET:', fallbackLookAtTarget);
      } else {
        // Last resort: create a reasonable lookAt target in front of the camera
        const defaultLookAt = camera.position.clone().add(new THREE.Vector3(0, 0, 10));
        cameraStateRef.current.savedLookAtTarget = defaultLookAt;
        console.log('💾 SAVED DEFAULT LOOKAT TARGET:', defaultLookAt);
      }
      
      console.log('💾 FINAL SAVED LOOKAT TARGET:', cameraStateRef.current.savedLookAtTarget);
      
      console.log('💾 SAVED SPLINE PROGRESS:', (cameraStateRef.current.savedSplineProgress * 100).toFixed(3) + '%');
      console.log('💾 CURRENT CAMERA POSITION:', camera.position);
      console.log('💾 WILL RETURN TO SPLINE AT t =', cameraStateRef.current.savedSplineProgress);
      console.log('💾 SPLINE T PRECISION:', cameraStateRef.current.savedSplineProgress);
    }
    
    console.log('=== HOTSPOT CLICK ===');
    console.log('🎯 HOTSPOT POSITION ANALYSIS:');
    console.log('  Hotspot name:', hotspot.name);
    console.log('  Hotspot type:', hotspot.type);
    console.log('  Hotspot LOCAL position:', hotspot.position);
    console.log('  Hotspot WORLD position:', target);
    console.log('  Current camera position:', camera.position);
    console.log('  Current focused state:', isFocusedOnHotspot);
    console.log('  Distance from camera to hotspot:', camera.position.distanceTo(target));
    
    // Calculate start position for animation
    const startPosition = isFocusedOnHotspot ? currentCameraPositionRef.current.clone() : camera.position.clone();
    
    // Get the focal distance for this specific hotspot
    const focalDistance = HOTSPOT_FOCAL_DISTANCES[hotspot.name] || 2.0; // default to 2.0 if not configured
    
    // Calculate the direction from camera to hotspot
    const cameraToHotspot = target.clone().sub(camera.position).normalize();
    
    // Use the opposite direction (camera should be "in front" of hotspot)
    const offsetDirection = cameraToHotspot.clone().multiplyScalar(-1);
    
    // Add some upward offset for better viewing angle
    offsetDirection.y += 0.3;
    offsetDirection.normalize();
    
    // Calculate the final camera position using the configured focal distance
    const newCamPos = target.clone().add(offsetDirection.multiplyScalar(focalDistance));
    
    // Ensure minimum height for good viewing angle
    newCamPos.y = Math.max(newCamPos.y, target.y + 1.5);
    
    console.log('🎯 ANIMATION SETUP:', {
      hotspot: hotspot.name,
      focalDistance: focalDistance,
      startPosition: startPosition,
      endPosition: newCamPos,
      distance: startPosition.distanceTo(newCamPos).toFixed(2) + 'm'
    });
    
    // Clear any existing debug markers only when showDebug is true
    if (showDebug && sceneRef.current) {
      console.log('🧹 CLEANING UP EXISTING DEBUG MARKERS (showDebug enabled)...');
      console.log('  Scene children before cleanup:', sceneRef.current.children.length);
      
      let removedCount = 0;
      sceneRef.current?.children.forEach((child: THREE.Object3D) => {
        if (child.name === 'debug_hotspot_marker' || child.name === 'debug_camera_marker' ||
            child.name === 'debug_intro_start_marker' || child.name === 'debug_intro_end_marker') {
          sceneRef.current?.remove(child);
          removedCount++;
          console.log('  Removed debug marker:', child.name);
        }
      });
      
      console.log('  Debug markers removed:', removedCount);
      console.log('  Scene children after cleanup:', sceneRef.current.children.length);
    } else if (!showDebug) {
      console.log('🧹 DEBUG MARKER CLEANUP SKIPPED (showDebug disabled)');
    }
    
    // Create debug spheres only when showDebug is true
    if (showDebug && sceneRef.current) {
      console.log('🎯 CREATING DEBUG SPHERES (showDebug enabled)...');
            console.log('  Scene has children:', sceneRef.current.children.length);
            console.log('  Target position:', target);
            
            // Create red sphere on the clicked hotspot
            const hotspotMarker = new THREE.Mesh(
              new THREE.SphereGeometry(1.5, 16, 16),
              new THREE.MeshBasicMaterial({ 
                color: 0xff0000, // Red color for hotspot
                transparent: true, 
                opacity: 0.9 
              })
            );
            hotspotMarker.position.copy(target);
            hotspotMarker.name = 'debug_hotspot_marker';
            sceneRef.current.add(hotspotMarker);
            
            // Create blue sphere at the calculated camera position
            const cameraMarker = new THREE.Mesh(
              new THREE.SphereGeometry(1.0, 16, 16),
              new THREE.MeshBasicMaterial({ 
                color: 0x0066ff, // Blue color for camera target
                transparent: true, 
                opacity: 0.8 
              })
            );
            cameraMarker.position.copy(newCamPos);
            cameraMarker.name = 'debug_camera_marker';
            sceneRef.current.add(cameraMarker);
            
            console.log('🎯 DEBUG SPHERES CREATED:');
            console.log('  Red sphere (hotspot):', hotspotMarker.position);
            console.log('  Blue sphere (camera target):', cameraMarker.position);
            console.log('  Scene now has children:', sceneRef.current.children.length);
            
            // Force a render to show the markers
            if (rendererRef.current && cameraRef.current) {
              rendererRef.current.render(sceneRef.current, cameraRef.current);
              console.log('🎯 RENDER FORCED: Debug spheres should now be visible');
            }
    } else if (!showDebug) {
      console.log('🎯 DEBUG SPHERES SKIPPED (showDebug disabled)');
    } else {
      console.log('❌ ERROR: Scene reference is null, cannot create debug spheres');
    }
    
    // CREATE SMOOTH FLY-IN CAMERA PATH
    console.log('🚀 CREATING SMOOTH FLY-IN CAMERA PATH:');
    
    // Set animation state to prevent interference
    isAnimatingRef.current = true;
    
    // Store the target for lookAt
    const animationTarget = target.clone();
    
    // Store the target position for later verification
    targetCameraPositionRef.current.copy(newCamPos);
    
    // CRITICAL: Kill any existing GSAP animations on camera position
    if ((camera.position as any)._gsap) {
      console.log('🚨 KILLING EXISTING GSAP ANIMATIONS');
      gsap.killTweensOf(camera.position);
    }
    
    // Create a beautiful bezier curve with slight detour for visual appeal
    // Use current camera position for continuous path calculation (exact start)
    const startPos = camera.position.clone();

    // HARD-LOCK the very first frame to the exact current position to avoid any visible jerk
    camera.position.copy(startPos);
    if (cameraRef.current) cameraRef.current.position.copy(startPos);
    if (rendererRef.current && sceneRef.current) {
      rendererRef.current.render(sceneRef.current, camera);
    }
    const endPos = newCamPos.clone();
    
    // Update the current camera position reference for next path calculation
    currentCameraPositionRef.current.copy(camera.position);
    
    // Calculate the direction from start to end
    const direction = endPos.clone().sub(startPos).normalize();
    const distance = startPos.distanceTo(endPos);
    
    // Build cubic bezier control points (plugin-free) for a gentle arc
    const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
    const controlPoint1 = startPos.clone()
      .add(direction.clone().multiplyScalar(distance * 0.33))
      .add(perpendicular.clone().multiplyScalar(distance * 0.15));
    controlPoint1.y += Math.max(1.0, distance * 0.1);

    const controlPoint2 = endPos.clone()
      .sub(direction.clone().multiplyScalar(distance * 0.33))
      .add(perpendicular.clone().multiplyScalar(-distance * 0.10));
    controlPoint2.y += Math.max(0.5, distance * 0.08);

    // Create plugin-free cubic bezier curve
    const curve3D = new THREE.CubicBezierCurve3(
      startPos,
      controlPoint1,
      controlPoint2,
      endPos
    );
    
    console.log('🎬 CREATING BEAUTIFUL BEZIER CURVE:');
    console.log('  Start position:', startPos);
    console.log('  ControlPoint1:', controlPoint1);
    console.log('  ControlPoint2:', controlPoint2);
    console.log('  End position:', endPos);
    console.log('  Distance to travel:', startPos.distanceTo(endPos).toFixed(2) + 'm');
    
    // Bezier animation using GSAP tween over parameter t
    console.log('🎬 STARTING CUBIC BEZIER (plugin-free) ANIMATION:');
    
    // Set animation flag and update camera state
    isAnimatingRef.current = true;
    cameraStateRef.current.isOnMainPath = false; // CRITICAL: Mark as NOT on main path during hotspot animation
    
    // Tween parameter t from 0 -> 1 and sample curve3D.getPoint(t)
    const tweenParam = { t: 0 };
    console.log('🎬 Creating GSAP tween with parameters:', { duration: 2.5, ease: "power2.inOut" });
    
    const tween = gsap.to(tweenParam, {
      duration: 2.5,
      t: 1,
      ease: "power2.inOut",
      type: "cubic",
      onUpdate: () => {
        // Sample curve and ensure exact start at t=0 to avoid initial jerk
        const p = tweenParam.t === 0 ? startPos : curve3D.getPoint(tweenParam.t);
        if (tweenParam.t === 0) {
          // lock to exact start on first tick
          camera.position.copy(startPos);
          if (cameraRef.current) cameraRef.current.position.copy(startPos);
        } else {
          camera.position.copy(p);
          if (cameraRef.current) cameraRef.current.position.copy(p);
        }
        camera.lookAt(animationTarget);
        camera.updateMatrixWorld();
        
        // Log progress every 20% of animation
        if (Math.floor(tweenParam.t * 5) !== Math.floor((tweenParam.t - 0.001) * 5)) {
          console.log(`🎬 Animation progress: ${Math.round(tweenParam.t * 100)}% - Position: ${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}`);
        }
        
        // Render during animation to ensure smooth movement
        if (rendererRef.current && sceneRef.current) {
          rendererRef.current.render(sceneRef.current, camera);
        }
      },
      onComplete: () => {
        console.log('🎉 BEZIER ANIMATION COMPLETED!');
        console.log('  Final camera position:', endPos);
        console.log('  Animation target:', animationTarget);
        
        // Set final camera position
        camera.position.copy(endPos);
        if (cameraRef.current) cameraRef.current.position.copy(endPos);
        camera.lookAt(animationTarget);
        camera.updateMatrixWorld();
        
        // Update animation state
        isAnimatingRef.current = false;
        currentCameraPositionRef.current.copy(endPos);
        cameraStateRef.current.isOnMainPath = false;
        cameraStateRef.current.lastHotspotPosition = endPos.clone();
        cameraStateRef.current.currentJourneyStart.copy(endPos);
        setIsFocusedOnHotspot(true);
        isFocusedOnHotspotRef.current = true;
        
        console.log('🎯 HOTSPOT STATE SET: isOnMainPath = false, isFocusedOnHotspot = true');
        console.log('🎯 Camera should now show: 🎯 Branch Path');
        
        console.log('✅ CAMERA STATE UPDATED:');
        console.log('  isAnimatingRef:', isAnimatingRef.current);
        console.log('  isOnMainPath:', cameraStateRef.current.isOnMainPath);
        console.log('  lastHotspotPosition:', cameraStateRef.current.lastHotspotPosition);
        console.log('  currentJourneyStart:', cameraStateRef.current.currentJourneyStart);
        
        // Force one final render to ensure the end position is visible
        if (rendererRef.current && sceneRef.current) {
          rendererRef.current.render(sceneRef.current, camera);
          console.log('🎬 Final render completed');
        }
        
        // 🎨 TRIGGER GALLERY ON ANIMATION COMPLETION
        console.log('🎨 ANIMATION COMPLETE - TRIGGERING GALLERY FOR:', hotspot.name);
        console.log('🎨 Hotspot object details:', {
          name: hotspot.name,
          type: hotspot.type,
          uuid: hotspot.uuid,
          userData: hotspot.userData
        });
        setCurrentHotspot(hotspot.name);
        loadGalleryImages(hotspot.name);
        setGalleryAnimating(true);
        
        // Animate gallery in with staggered thumbnail animations
        setTimeout(() => {
          setGalleryVisible(true);
          setGalleryAnimating(false);
          // Disable scene mouse events when gallery opens
          disableSceneMouseEvents();
        }, 100); // Small delay to ensure smooth transition
        
        console.log('🎯 READY FOR NEXT HOTSPOT JOURNEY!');
      }
    });
    
    console.log('🚀 CUBIC BEZIER ANIMATION STARTED: Duration 2.5s, easing power2.inOut');
    console.log('🎬 GSAP tween object created:', tween);
    console.log('🎬 Tween properties:', { 
      duration: tween.duration(), 
      isActive: tween.isActive(),
      progress: tween.progress()
    });
  };
  // Function to return to main journey path
  const continueJourney = () => {
    // 🎨 CLOSE GALLERY IMMEDIATELY WHEN CONTINUE JOURNEY IS CLICKED
    closeGallery();
    
    if (!cameraRef.current || !sceneRef.current || !rendererRef.current) return;
    
    const camera = cameraRef.current;
    
    console.log('🚀 RETURNING TO MAIN JOURNEY PATH:');
    console.log('  Current focused state:', isFocusedOnHotspot);
    console.log('  Current camera position:', camera.position);
    console.log('  Camera state:', cameraStateRef.current);
    
    // Set animating state to prevent interference
    isAnimatingRef.current = true;
    
    // Get the target position based on current state
    let targetPosition: THREE.Vector3;
    console.log('🔍 CONTINUE JOURNEY - Current State Analysis:');
    console.log('  isOnMainPath:', cameraStateRef.current.isOnMainPath);
    console.log('  mainPathPosition:', cameraStateRef.current.mainPathPosition);
    console.log('  journeyStartPosition:', cameraStateRef.current.journeyStartPosition);
    console.log('  lastHotspotPosition:', cameraStateRef.current.lastHotspotPosition);
    
    if (cameraStateRef.current.isOnMainPath) {
      // We're already on main path, return to journey start
      targetPosition = cameraStateRef.current.journeyStartPosition;
      console.log('🎯 RETURNING to journey start position:', targetPosition);
    } else {
      // We're at a hotspot - GO BACK to exact spline point where we left off
      // This ensures perfect alignment with the main tour path
      if (cameraStateRef.current.exactSplinePosition && cameraStateRef.current.savedSplineProgress !== undefined) {
        // Use the exact saved position for perfect precision
        targetPosition = cameraStateRef.current.exactSplinePosition.clone();
        console.log('🎯 RETURNING to EXACT SAVED SPLINE POSITION:', targetPosition);
        console.log('🔄 SAVED SPLINE PROGRESS t =', cameraStateRef.current.savedSplineProgress);
        console.log('🔄 REVERSING: From branch path back to exact saved position');
        console.log('🔄 POSITION PRECISION: Using saved exactSplinePosition for perfect alignment');
      } else if (cameraStateRef.current.savedSplineProgress !== undefined && gsapCurveRef.current) {
        // Fallback: Get the point on the spline where we left off
        targetPosition = gsapCurveRef.current.getPointAt(cameraStateRef.current.savedSplineProgress);
        console.log('🎯 RETURNING to spline point at t =', cameraStateRef.current.savedSplineProgress);
        console.log('🔄 SPLINE POINT:', targetPosition);
        console.log('🔄 REVERSING: From branch path back to calculated spline position');
        console.log('🔄 SPLINE CURVE AVAILABLE:', !!gsapCurveRef.current);
        console.log('🔄 SPLINE POINTS COUNT:', gsapCurveRef.current.points.length);
      } else {
        // Final fallback to stored main path position if spline not available
        targetPosition = cameraStateRef.current.mainPathPosition.clone();
        console.log('🎯 FINAL FALLBACK: Returning to stored main path position:', targetPosition);
        console.log('🔄 REVERSING: From branch path back to main scroll path');
        console.log('🔄 SPLINE PROGRESS AVAILABLE:', cameraStateRef.current.savedSplineProgress !== undefined);
        console.log('🔄 GSAP CURVE AVAILABLE:', !!gsapCurveRef.current);
        console.log('🔄 EXACT POSITION AVAILABLE:', !!cameraStateRef.current.exactSplinePosition);
      }
    }
    
    // Create debug spheres for continue journey animation when showDebug is true
    if (showDebug && sceneRef.current) {
      console.log('🎯 CREATING CONTINUE JOURNEY DEBUG SPHERES...');
      
      // Create green sphere at the current position (where we're returning from)
      const fromMarker = new THREE.Mesh(
        new THREE.SphereGeometry(1.0, 16, 16),
        new THREE.MeshBasicMaterial({ 
          color: 0x00ff00, // Green color for return-from position
          transparent: true, 
          opacity: 0.8 
        })
      );
      fromMarker.position.copy(camera.position);
      fromMarker.name = 'debug_return_from_marker';
      sceneRef.current.add(fromMarker);
      
      // Create orange sphere at the target position (where we're returning to)
      const toMarker = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 16, 16),
        new THREE.MeshBasicMaterial({ 
          color: 0xff8800, // Orange color for return-to position
          transparent: true, 
          opacity: 0.9 
        })
      );
      toMarker.position.copy(targetPosition);
      toMarker.name = 'debug_return_to_marker';
      sceneRef.current.add(toMarker);
      
      console.log('🎯 CONTINUE JOURNEY DEBUG SPHERES CREATED:');
      console.log('  Green sphere (return from):', fromMarker.position);
      console.log('  Orange sphere (return to):', toMarker.position);
    } else if (!showDebug) {
      console.log('🎯 CONTINUE JOURNEY DEBUG SPHERES SKIPPED (showDebug disabled)');
    }
    
    // Animate camera back to the target position
    console.log('🎬 STARTING CONTINUE JOURNEY ANIMATION:');
    console.log('  From position:', camera.position);
    console.log('  To position:', targetPosition);
    console.log('  Distance:', camera.position.distanceTo(targetPosition).toFixed(3) + 'm');
    
    // Check if we actually need to move
    const distance = camera.position.distanceTo(targetPosition);
    if (distance < 0.1) {
      console.log('⚠️ WARNING: Target position is too close to current position, no animation needed');
      // Still complete the journey but skip animation
      isAnimatingRef.current = false;
      setIsFocusedOnHotspot(false);
      isFocusedOnHotspotRef.current = false;
      setClickedHotspot(null);
      cameraStateRef.current.isOnMainPath = true;
      return;
    }
    
    // CRITICAL: Get the target lookAt position for smooth animation
    let targetLookAt: THREE.Vector3;
    if (cameraStateRef.current.savedLookAtTarget) {
      targetLookAt = cameraStateRef.current.savedLookAtTarget.clone();
      console.log('🎯 ANIMATING TO SAVED LOOKAT TARGET:', targetLookAt);
    } else {
      // Fallback: Calculate lookAt target from spline progress
      if (cameraStateRef.current.savedSplineProgress !== undefined && gsapLookAtTargetsRef.current) {
        const lookAtIndex = Math.floor(cameraStateRef.current.savedSplineProgress * (gsapLookAtTargetsRef.current.length - 1));
        targetLookAt = gsapLookAtTargetsRef.current[Math.max(0, Math.min(lookAtIndex, gsapLookAtTargetsRef.current.length - 1))];
        console.log('🎯 ANIMATING TO CALCULATED LOOKAT TARGET:', targetLookAt);
      } else {
        // Final fallback: Look at cube center
        targetLookAt = cubePos.current.clone();
        console.log('🎯 ANIMATING TO CUBE CENTER (fallback):', targetLookAt);
      }
    }
    
    // Preserve current lookAt target (fixed world point) so we don't change it during zoom out
    const fixedLookAt = (() => {
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      // Use a reasonably large distance to stabilize the world point
      const distance = 100;
      return camera.position.clone().add(direction.multiplyScalar(distance));
    })();

    // Create a timeline for position-only animation, keep lookAt fixed
    const timeline = gsap.timeline({
      onUpdate: () => {
        // Ensure both camera and cameraRef are updated
        camera.updateMatrixWorld();
        if (cameraRef.current) {
          cameraRef.current.position.copy(camera.position);
        }
        
        // Keep looking at the same world-space point throughout the animation
        camera.lookAt(fixedLookAt);
        
        // Force render to show the animation
        if (rendererRef.current && sceneRef.current) {
          rendererRef.current.render(sceneRef.current, camera);
        }
      },
      onComplete: () => {
        console.log('✅ RETURNED TO MAIN JOURNEY PATH:');
        console.log('  Final camera position:', camera.position);
        console.log('  Final lookAt target:', targetLookAt);
        console.log('  Target position reached:', targetPosition);
        
        // Reset all states
        isAnimatingRef.current = false;
        setIsFocusedOnHotspot(false);
        isFocusedOnHotspotRef.current = false;
        setClickedHotspot(null);
        
        // Close gallery when returning to main path
        closeGallery();
        
            // Clean up debug markers only when showDebug is true
    if (showDebug && sceneRef.current) {
          sceneRef.current?.children.forEach((child: THREE.Object3D) => {
            if (child.name === 'debug_hotspot_marker' || child.name === 'debug_camera_marker' || 
                child.name === 'debug_return_from_marker' || child.name === 'debug_return_to_marker' ||
                child.name === 'debug_intro_start_marker' || child.name === 'debug_intro_end_marker') {
              sceneRef.current?.remove(child);
              console.log('🧹 Removed debug marker:', child.name);
            }
          });
        }
        
        // Update camera state for next journey
        // Set back to main path mode since we're returning to the main scroll path
        cameraStateRef.current.isOnMainPath = true;
        
        // Show ScrollDownCTA when returning to main path, unless near end of content
        try {
          const st = window.scrollY || document.documentElement.scrollTop || 0;
          const sh = (document.documentElement.scrollHeight || 0) - (window.innerHeight || 0);
          const scrollPercentage = sh > 0 ? (st / sh) * 100 : 0;
          if (scrollPercentage < 96) {
            const handler = (window as any).__scrollDownCTAIntroComplete;
            if (typeof handler === 'function') {
              handler();
            }
          }
        } catch {}
        
        // CRITICAL: Verify the camera is at the expected end position
        // Use the targetPosition from the animation, not the cleared targetCameraPositionRef
        const expectedEndPosition = targetPosition;
        const actualPosition = camera.position.clone();
        const positionDifference = actualPosition.distanceTo(expectedEndPosition);
        
        console.log('🎯 POSITION VERIFICATION after animation:');
        console.log('  Expected end position:', expectedEndPosition);
        console.log('  Actual camera position:', actualPosition);
        console.log('  Position difference:', positionDifference.toFixed(6));
        
        // If we have an exact saved position, use that for verification
        if (cameraStateRef.current.exactSplinePosition) {
          const exactPosition = cameraStateRef.current.exactSplinePosition;
          const exactDifference = actualPosition.distanceTo(exactPosition);
          console.log('🎯 EXACT POSITION VERIFICATION:');
          console.log('  Saved exact position:', exactPosition);
          console.log('  Difference from exact:', exactDifference.toFixed(6));
          
          // Use the exact position if we're close enough
          if (exactDifference < 0.01) {
            console.log('✅ Using exact saved position for perfect alignment');
            targetPosition = exactPosition.clone();
          }
        }
        
        if (positionDifference > 0.01) { // Tighter tolerance for precision
          console.warn('⚠️ WARNING: Camera not at expected end position!');
          console.warn('  Forcing camera to expected position...');
          camera.position.copy(expectedEndPosition);
          // Do NOT change lookAt during verification to avoid visual snapping
        }
        
        // CRITICAL: Force camera to stay at the exact end position
        // This prevents any position overrides from the main animation loop
        const finalPosition = expectedEndPosition.clone();
        
        console.log('🔧 POSITION ENFORCEMENT - BEFORE:');
        console.log('  Target end position:', finalPosition);
        console.log('  Camera position before force:', camera.position);
        console.log('  CameraRef position before force:', cameraRef.current?.position);
        
        // Small delay to ensure GSAP animation is fully complete before position enforcement
        setTimeout(() => {
          // FORCE the camera to the end position
          camera.position.set(finalPosition.x, finalPosition.y, finalPosition.z);
          
          // Also update the camera ref to ensure consistency
          if (cameraRef.current) {
            cameraRef.current.position.copy(finalPosition);
          }
          
          // Update refs with the verified position
          currentCameraPositionRef.current.copy(finalPosition);
          
          // Update journey start position to current position for next journey
          cameraStateRef.current.journeyStartPosition.copy(finalPosition);
          cameraStateRef.current.mainPathPosition.copy(finalPosition);
          
          console.log('🔧 POSITION ENFORCEMENT - AFTER:');
          console.log('  Camera position after force:', camera.position);
          console.log('  CameraRef position after force:', cameraRef.current?.position);
          console.log('  Current journey start updated to:', currentCameraPositionRef.current);
          
          // CRITICAL: Double-check the position was set correctly
          const checkPosition = camera.position.clone();
          const isCorrect = checkPosition.distanceTo(finalPosition) < 0.01;
          console.log('🔍 FINAL POSITION CHECK:', isCorrect ? '✅ SUCCESS' : '❌ FAILED');
          console.log('  Expected:', finalPosition);
          console.log('  Current journey start updated to:', currentCameraPositionRef.current);
          
          if (!isCorrect) {
            console.error('🚨 POSITION SET FAILED - Forcing again...');
            camera.position.copy(finalPosition);
            if (cameraRef.current) {
              cameraRef.current.position.copy(finalPosition);
            }
          }
          
          // CRITICAL: Update the real-time position state for the focused panel
          setRealTimeCameraPosition(finalPosition.clone());
          
          // Animation completed successfully
          console.log('✅ ANIMATION COMPLETED - Camera at end position:', finalPosition);
          
          // Force a render to ensure the position is visible
          if (rendererRef.current && sceneRef.current && cameraRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
          }
          
          // Now clear the target position after all verification is complete
          targetCameraPositionRef.current.set(0, 0, 0);
        }, 50); // 50ms delay for smooth completion
        
        // Position monitoring is now handled by the main animation loop
        // No need for aggressive locking that causes flickering
      }
    });
    
    // Add position animation to timeline (position only)
    timeline.to(camera.position, {
      duration: 2.5,
      x: targetPosition.x,
      y: targetPosition.y,
      z: targetPosition.z,
      ease: "power2.inOut"
    }, 0); // Start at time 0
    // Do NOT change lookAt target here; it's maintained via fixedLookAt during onUpdate
    
    console.log('🎬 TIMELINE ANIMATION STARTED: Duration 2.5s, position only (lookAt set immediately)');
    console.log('🎬 Position target:', targetPosition);
    console.log('🎬 LookAt target:', targetLookAt);
  };

  // Function to setup all lighting for the scene
  const setupSceneLighting = (scene: THREE.Scene) => {
    // Ambient light for overall scene illumination
    scene.add(new THREE.AmbientLight(0xffffff, 1));
    
    // Main directional light
    scene.add(new THREE.DirectionalLight(0xffffff, 1));
    
    // Hemisphere light for sky/ground color
    scene.add(new THREE.HemisphereLight(0xccc1b1, 0x080820, 1.5));
    
    // Additional light source 45 degrees diagonally from cube to wall corner
    const cubeHeight = CUBE_SIZE; // 5 units
    const lightHeight = cubeHeight * 10; // 50 units above cube
    const diagonalDistance = 20; // Distance from cube center to wall corner
    
    const diagonalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    diagonalLight.position.set(
      diagonalDistance * Math.cos(Math.PI / 4), // 45 degrees X
      lightHeight, // 4 times cube height above
      diagonalDistance * Math.sin(Math.PI / 4)  // 45 degrees Z
    );
    diagonalLight.target.position.set(10, 0, 0); // Point at cube center
    diagonalLight.castShadow = true; // Enable shadow casting
    diagonalLight.shadow.mapSize.width = 2048;
    diagonalLight.shadow.mapSize.height = 2048;
    diagonalLight.shadow.camera.near = 0.1;
    diagonalLight.shadow.camera.far = 100;
    diagonalLight.shadow.camera.left = -40;
    diagonalLight.shadow.camera.right = 40;
    diagonalLight.shadow.camera.top = 40;
    diagonalLight.shadow.camera.bottom = -40;
    diagonalLight.shadow.bias = -0.0001;
    diagonalLight.shadow.mapSize.width = 2048;
    diagonalLight.shadow.mapSize.height = 2048;
    scene.add(diagonalLight);
    scene.add(diagonalLight.target);
  };
  // Function to create and setup the scene
  const createScene = () => {
    const scene = new THREE.Scene();
    const colors = getThreeJSThemeColors();
    
    // Setup all lighting for the scene
    setupSceneLighting(scene);
    
    // Grid Helper for coordinate system visualization (if enabled)
    if (WITH_HELPERS) {
      const gridHelper = new THREE.GridHelper(100, 20, colors.GRID_COLOR_MAJOR, colors.GRID_COLOR_MINOR);
      gridHelper.position.y = FLOOR_Y_POSITION - 0.01; // Slightly below floor to not interfere with shadows
      scene.add(gridHelper);
      
      // Axes Helper for X, Y, Z coordinate visualization
      const axesHelper = new THREE.AxesHelper(15);
      axesHelper.position.y = FLOOR_Y_POSITION + 0.02; // Above grid
      scene.add(axesHelper);
      
      // Add letters around axes
      const createText = (text: string, position: THREE.Vector3, color: number) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 64;
        canvas.height = 64;
        if (context) {
          context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
          context.font = '48px Arial';
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.fillText(text, 32, 32);
        }
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.position.copy(position);
        sprite.scale.set(2, 2, 2);
        scene.add(sprite);
      };
      
      // Add X, Y, Z labels
      // createText('X', new THREE.Vector3(20, 0, 0), 0xff0000); // Red X-axis
      // createText('Y', new THREE.Vector3(0, 20, 0), 0x00ff00); // Green Y-axis
      // createText('Z', new THREE.Vector3(0, 0, 20), 0x0000ff); // Blue Z-axis
    }
    
    // Floor
    // const floorMat = new THREE.MeshStandardMaterial({ color: colors.FLOOR_COLOR });
    // const floor = new THREE.Mesh(new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE), floorMat);
    // floor.rotation.x = -Math.PI / 2;
    // floor.position.y = FLOOR_Y_POSITION;
    // floor.receiveShadow = true; // Enable shadow receiving
    // scene.add(floor);
    
    // Walls
    // Removed: no walls are created or added to the scene

    // Load floor plan GLB model using dynamic import
    const loadFloorPlanModel = async () => {
      try {
        // Show loader immediately
        setShowLoader(true);
        setLoaderPercent(0);
        setLoaderLoadedMB(0);
        setLoaderTotalMB(null);

        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        const gltfLoader = new GLTFLoader();
        const modelUrl = `/models/no-material.glb?cb=${Date.now()}`;

        // Obtain total bytes via cache-busted HEAD so percent stays accurate
        try {
          const headRes = await fetch(modelUrl, { method: 'HEAD', cache: 'no-store' });
          const len = headRes.headers.get('content-length');
          if (len) {
            const total = parseInt(len, 10);
            if (!Number.isNaN(total) && total > 0) {
              loaderTotalBytesRef.current = total;
              setLoaderTotalMB(total / 1024 / 1024);
            }
          }
        } catch (e) {
          console.warn('[Loader] HEAD failed; continuing without total');
        }

        // Use a single XHR via THREE.FileLoader for accurate progress
        const fileLoader = new THREE.FileLoader();
        fileLoader.setResponseType('arraybuffer');
        

        fileLoader.load(
          modelUrl,
          (data: ArrayBuffer) => {
            gltfLoader.parse(
              data,
              '',
              (gltf: any) => {
                try {
                  const model = gltf.scene;

                  // Normalize and scale to target visibility
                  model.position.set(0, 0, 0);
                  model.rotation.set(0, 0, 0);
                  model.scale.set(1, 1, 1);
                  model.frustumCulled = false;

                  let box = new THREE.Box3().setFromObject(model);
                  const size = box.getSize(new THREE.Vector3());
                  const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
                  const TARGET_SIZE = 30;
                  const s = (TARGET_SIZE / maxDim) * 2; // 3x scale
                  model.scale.setScalar(s);

                  // Rotate house model +90 degrees around Y axis and update matrices
                  model.rotation.y = Math.PI / 2;
                  model.updateMatrix();
                  model.updateMatrixWorld(true);

                  box = new THREE.Box3().setFromObject(model);
                  const sphere = box.getBoundingSphere(new THREE.Sphere());

                  // CRITICAL FIX: Collect hotspots AFTER transformations are applied
                  // This ensures hotspots have their final world positions
                  const clickableObjects: THREE.Object3D[] = [];
                  
                  console.log('Starting hotspot collection AFTER transformations...');
                  console.log('Total objects in model:', model.children.length);
                  console.log('Model transformations applied:');
                  console.log('  Scale:', model.scale);
                  console.log('  Rotation:', model.rotation);
                  console.log('  Position:', model.position);
                  
                  // DEEP INVESTIGATION: Let's see the entire model structure
                  console.log('🔍 FULL MODEL STRUCTURE INVESTIGATION:');
                  console.log('Model root:', model.name, 'type:', model.type);
                  console.log('Model children count:', model.children.length);
                  
                  // First, let's see what's at the root level
                  model.children.forEach((rootChild: any, rootIndex: number) => {
                    console.log(`Root child ${rootIndex}:`, rootChild.name, 'type:', rootChild.type);
                    console.log(`  Root child position:`, rootChild.position);
                    console.log(`  Root child children count:`, rootChild.children.length);
                    
                    // Go deeper into each root child
                    rootChild.children.forEach((deepChild: any, deepIndex: number) => {
                      console.log(`    Deep child ${deepIndex}:`, deepChild.name, 'type:', deepChild.type);
                      console.log(`      Deep child position:`, deepChild.position);
                      console.log(`      Deep child children count:`, deepChild.children.length);
                      
                      // Go even deeper if needed
                      deepChild.children.forEach((deeperChild: any, deeperIndex: number) => {
                        console.log(`        Deeper child ${deeperIndex}:`, deeperChild.name, 'type:', deeperChild.type);
                        console.log(`          Deeper child position:`, deeperChild.position);
                      });
                    });
                  });
                  
                  // Traverse the TRANSFORMED model, not the original gltf.scene
                  model.traverse((child: any) => {
                    // Propagate hotspot identity down the hierarchy so sub-mesh clicks can resolve
                    if (child && child.isMesh) {
                      let ancestor: THREE.Object3D | null = child.parent;
                      while (ancestor) {
                        if (ancestor.name && ancestor.name.includes('Hotspot')) {
                          child.userData = child.userData || {};
                          if (!child.userData.hotspotName) {
                            child.userData.hotspotName = ancestor.name;
                            console.log(`🔗 Propagated hotspot name "${ancestor.name}" to child mesh "${child.name}"`);
                          }
                          break;
                        }
                        ancestor = ancestor.parent;
                      }
                    }
                    console.log('Checking transformed object:', child.name, 'type:', child.type, 'hasMaterial:', !!child.material);
                    
                    if (child.name.includes("Hotspot")) {  // e.g. "Hotspot_Cabinet1"
                      console.log('Found transformed hotspot:', child.name, 'type:', child.type);
                      clickableObjects.push(child);
                      
                      // Ensure the hotspot has a material (and make it unique so color changes don't bleed)
                      if (!child.material) {
                        console.log('Creating material for hotspot:', child.name);
                        const colors = getThreeJSThemeColors();
                        child.material = new THREE.MeshStandardMaterial({ 
                          color: colors.HOTSPOT_NORMAL_COLOR,
                          // transparent: true,
                          // opacity: 0.8  // Increased from 0.2 to 0.8 for better visibility
                        });
                      } else {
                        // Clone material to avoid shared instances across multiple meshes
                        try {
                          const srcMat = child.material as THREE.MeshStandardMaterial;
                          const cloned = srcMat.clone();
                          (cloned as any).userData = { ...(srcMat as any).userData };
                          child.material = cloned;
                        } catch (e) {
                          console.warn('Could not clone hotspot material for', child.name, e);
                        }
                      }
                      
                      // Make sure the hotspot is visible
                      child.visible = true;
                      child.frustumCulled = false;
                      
                      // Assign consistent bright purple color to this hotspot
                      hotspotColorsRef.current.set(child, HOTSPOT_COMPLEMENTARY_HOVER_COLOR);
                      
                      // Set initial color to theme color
                      if (child.material) {
                        const colors = getThreeJSThemeColors();
                        (child.material as THREE.MeshStandardMaterial).color.setHex(colors.HOTSPOT_NORMAL_COLOR);
                        console.log('Set initial color for', child.name, 'to theme color');
                      }
                      
                      console.log('Transformed hotspot setup complete:', child.name, 'with color:', '#' + HOTSPOT_COMPLEMENTARY_HOVER_COLOR.toString(16).padStart(6, '0'));
                    }
                  });
                  
                  // Store hotspots for interaction
                  clickableObjectsRef.current = clickableObjects;
                  
                  // Log total hotspots found
                  console.log('Total transformed hotspots collected:', clickableObjects.length);
                  console.log('All transformed hotspots:', clickableObjects);
                  console.log('Hotspot names:', clickableObjects.map(obj => obj.name));
                  
                  // Create pulse markers for hotspots after they're loaded
                  if (clickableObjects.length > 0) {
                    setTimeout(() => {
                      createHotspotPulseMarkers();
                    }, 100); // Small delay to ensure scene is ready
                  }
                  
                  // INVESTIGATE: Why do all hotspots have identical coordinates?
                  // Let's examine the original GLTF data before any transformations
                  console.log('🔍 INVESTIGATING ORIGINAL HOTSPOT COORDINATES:');
                  console.log('  This will help understand why all hotspots have identical positions');
                  
                  // Examine the original GLTF scene before any transformations
                  console.log('🔍 ORIGINAL GLTF SCENE (BEFORE TRANSFORMATIONS):');
                  console.log('  Original gltf.scene children count:', gltf.scene.children.length);
                  
                    gltf.scene.traverse((originalChild: any) => {
                      
                      if (originalChild.isMesh) {
                        // Add edge lines for contour effect on all meshes (including hotspots)
                        try {
                          const edges = new THREE.EdgesGeometry(originalChild.geometry);
                          const line = new THREE.LineSegments(
                            edges,
                            new THREE.LineBasicMaterial({ 
                              color: 0x000000,
                              transparent: true,
                              opacity: 0.8
                            })
                          );
                          // Make sure edges don't interfere with raycasting
                          line.userData.isEdgeLine = true;
                          line.userData.isContourEdge = true;
                          line.visible = true;
                          originalChild.add(line);
                        } catch (error) {
                          console.warn(`Failed to create edges for mesh: ${originalChild.name}`, error);
                        }
                      }

                    if (originalChild.name.includes("Hotspot")) {
                      console.log(`  Original ${originalChild.name}:`);
                      console.log(`    Type: ${originalChild.type}`);
                      console.log(`    Position: ${originalChild.position.x.toFixed(3)}, ${originalChild.position.y.toFixed(3)}, ${originalChild.position.z.toFixed(3)}`);
                      console.log(`    Scale: ${originalChild.scale.x.toFixed(3)}, ${originalChild.scale.y.toFixed(3)}, ${originalChild.scale.z.toFixed(3)}`);
                      console.log(`    Rotation: ${originalChild.rotation.x.toFixed(3)}, ${originalChild.rotation.y.toFixed(3)}, ${originalChild.rotation.z.toFixed(3)}`);
                      console.log(`    Matrix: ${originalChild.matrix.elements.slice(12, 15).map((x: number) => x.toFixed(3)).join(', ')}`);
                      console.log(`    Parent: ${originalChild.parent?.name || 'No parent'}`);
                      console.log(`    Parent type: ${originalChild.parent?.type || 'No parent'}`);
                      
                      // Check if this is a clone or instance
                      console.log(`    Is clone: ${originalChild.isClone || false}`);
                      console.log(`    UUID: ${originalChild.uuid}`);
                    }
                  });
                  
                  // Also check the GLTF data structure
                  console.log('🔍 GLTF DATA STRUCTURE:');
                  console.log('  GLTF scene name:', gltf.scene.name);
                  console.log('  GLTF scene type:', gltf.scene.type);
                  console.log('  GLTF scene position:', gltf.scene.position);
                  console.log('  GLTF scene scale:', gltf.scene.scale);
                  console.log('  GLTF scene rotation:', gltf.scene.rotation);
                  console.log('  GLTF scene matrix:', gltf.scene.matrix.elements.slice(12, 15).map((x: number) => x.toFixed(3)).join(', '));
                  
                  // Debug: Show positions of all hotspots AFTER transformations
                  console.log('🔍 TRANSFORMED HOTSPOT POSITIONS:');
                  clickableObjects.forEach((hotspot, index) => {
                    console.log(`  ${index + 1}. ${hotspot.name}:`);
                    console.log(`     Local position: ${hotspot.position.x.toFixed(3)}, ${hotspot.position.y.toFixed(3)}, ${hotspot.position.z.toFixed(3)}`);
                    console.log(`     World position: ${hotspot.getWorldPosition(new THREE.Vector3()).x.toFixed(3)}, ${hotspot.getWorldPosition(new THREE.Vector3()).y.toFixed(3)}, ${hotspot.getWorldPosition(new THREE.Vector3()).z.toFixed(3)}`);
                    console.log(`     Parent: ${hotspot.parent?.name || 'No parent'}`);
                    console.log(`     Parent matrix: ${hotspot.parent?.matrix ? hotspot.parent.matrix.elements.slice(12, 15).map((x: number) => x.toFixed(3)).join(', ') : 'No parent matrix'}`);
                    console.log(`     Own matrix: ${hotspot.matrix.elements.slice(12, 15).map((x: number) => x.toFixed(3)).join(', ')}`);
                    
                    // Calculate the transformation difference
                    const worldPos = new THREE.Vector3();
                    hotspot.getWorldPosition(worldPos);
                    const localPos = hotspot.position;
                    const transformDiff = worldPos.clone().sub(localPos);
                    console.log(`     Transform difference: ${transformDiff.x.toFixed(3)}, ${transformDiff.y.toFixed(3)}, ${transformDiff.z.toFixed(3)}`);
                  });
                  
                  const colorEntries = Array.from(hotspotColorsRef.current.entries());
                  console.log('Assigned colors:', colorEntries.map((entry: any) => 
                    `${entry[0].name}: #${entry[1].toString(16).padStart(6, '0')}`
                  ));

                  // Apply shadows to the transformed model
                  model.traverse((child: any) => {
                    if (child instanceof THREE.Mesh) {
                      child.castShadow = true;
                      child.receiveShadow = true;
                    }
                  });

                  scene.add(model);
                  modelRef.current = model;
                  setModelPath(modelPath);

                  // Fit camera so the model is visible
                  if (cameraRef.current) {
                    const camera = cameraRef.current;
                    const fitOffset = 1.6;
                    const radius = Math.max(1e-3, sphere.radius);
                    const distance = fitOffset * radius / Math.tan((camera.fov * Math.PI / 180) / 2);
                    const direction = new THREE.Vector3(1, 0.6, 1).normalize();
                    const target = sphere.center.clone();
                    camera.position.copy(target.clone().add(direction.multiplyScalar(distance)));
                    camera.near = Math.max(0.01, radius / 100);
                    camera.far = Math.max(camera.near + 10, radius * 100);
                    camera.updateProjectionMatrix();
                    camera.lookAt(target);
                  }

                  if (rendererRef.current && sceneRef.current && cameraRef.current) {
                    // Avoid rendering a pre-intro still frame
                    if (!WITH_INTRO || introCompletedRef.current) {
                      rendererRef.current.render(sceneRef.current, cameraRef.current);
                    }
                  }

                  // Start intro now that model is loaded (second intro only)
                  if (WITH_INTRO && cameraRef.current && rendererRef.current && sceneRef.current) {
                                      // Set exact intro start frame (top view over cube)
                  cameraRef.current.up.set(0, 1, 0);
                  cameraRef.current.position.copy(INTRO_START_POS);
                  cameraRef.current.lookAt(cubePos.current);
                  cameraRef.current.updateProjectionMatrix();
                  cameraRef.current.updateMatrixWorld();
                  
                  // CRITICAL: Update camera state with the actual starting position
                  cameraStateRef.current.mainPathPosition.copy(INTRO_START_POS);
                  cameraStateRef.current.journeyStartPosition.copy(INTRO_START_POS);
                  cameraStateRef.current.isOnMainPath = true;
                  console.log('🎯 UPDATED camera state with INTRO_START_POS:', {
                    mainPathPosition: cameraStateRef.current.mainPathPosition,
                    journeyStartPosition: cameraStateRef.current.journeyStartPosition,
                    isOnMainPath: cameraStateRef.current.isOnMainPath
                  });
                  
                  startIntroAnimation(cameraRef.current, rendererRef.current, sceneRef.current);
                  }

                  const total = loaderTotalBytesRef.current;
                  const loaded = loaderLoadedBytesRef.current || (data?.byteLength ?? 0);
                  setLoaderPercent(100);
                  setLoaderLoadedMB(loaded / 1024 / 1024);
                  setLoaderTotalMB(total ? total / 1024 / 1024 : loaded / 1024 / 1024);
                } finally {
                  setShowLoader(false);
                }
              },
              (err: any) => {
                console.error('GLTF parse error:', err);
                setShowLoader(false);
                createFloorPlanPlaceholder();
              }
            );
          },
          (evt: ProgressEvent) => {
            // Accurate percent = loaded/total reflected to bar width (in pixels)
            const total = loaderTotalBytesRef.current ?? (evt.lengthComputable ? evt.total : 0);
            const loaded = evt.loaded ?? loaderLoadedBytesRef.current ?? 0;
            if (total && total > 0) {
              loaderTotalBytesRef.current = total;
              loaderLoadedBytesRef.current = loaded;
              const pct = (loaded / total) * 100;
              setLoaderPercent(pct);
              setLoaderLoadedMB(loaded / 1024 / 1024);
              setLoaderTotalMB(total / 1024 / 1024);
            } else {
              // Unknown total: show MB loaded
              loaderLoadedBytesRef.current = loaded;
              setLoaderPercent(50); // Mid-progress for indeterminate
              setLoaderLoadedMB(loaded / 1024 / 1024);
              setLoaderTotalMB(null);
            }
          },
          (err: any) => {
            console.error('FileLoader error:', err);
            setShowLoader(false);
            createFloorPlanPlaceholder();
          }
        );
      } catch (error) {
        console.error('Error importing GLTFLoader:', error);
        // Fallback to placeholder if loader fails
        setShowLoader(false);
        createFloorPlanPlaceholder();
      }
    };
    
    // Create fallback placeholder
    const createFloorPlanPlaceholder = () => {
      console.log('Creating fallback placeholder');
      const placeholderGeometry = new THREE.BoxGeometry(10, 2, 10);
      const placeholderMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFF0000, // Red color to make it very visible
        transparent: true, 
        opacity: 0.9 
      });
      const placeholder = new THREE.Mesh(placeholderGeometry, placeholderMaterial);
      placeholder.position.set(0, 5, 0); // Position above the cube
      placeholder.castShadow = true;
      placeholder.receiveShadow = true;
      scene.add(placeholder);
      console.log('Floor plan placeholder created at position:', placeholder.position);
      console.log('Placeholder added to scene');
    };
    
    // Model loading is now handled by useEffect when scene config is available
    
    // Cube
    if (SHOW_CUBE) {
      const cubeMaterial = new THREE.MeshStandardMaterial({ 
        color: colors.CUBE_COLOR, 
        emissive: colors.CUBE_EMISSIVE_COLOR 
      });
      const debugCube = new THREE.Mesh(
        new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE),
        cubeMaterial
      );
      debugCube.position.copy(cubePos.current);
      debugCube.castShadow = true; // Enable shadow casting
      debugCube.receiveShadow = true; // Enable shadow receiving
      debugCube.name = "Hotspot_Cube"; // Name for identification
      scene.add(debugCube);
      
      // Store cube reference for interaction
      cubeRef.current = debugCube;
      
      // Debug: log cube creation
      console.log('Cube created:', debugCube);
      console.log('Cube material:', cubeMaterial);
      console.log('Cube position:', debugCube.position);
    }
    
    return scene;
  };

  // Function to create and setup the camera
  const createCamera = () => {
    const camera = new THREE.PerspectiveCamera(
      CAMERA_FOV,
      window.innerWidth / window.innerHeight,
      CAMERA_NEAR,
      CAMERA_FAR
    );
    
    // Set initial camera position based on intro setting
    if (WITH_INTRO) {
      camera.position.copy(INTRO_START_POS);
    } else {
      camera.position.copy(ORBITAL_START_POS);
    }
    
    camera.lookAt(cubePos.current);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    
    return camera;
  };

  // Function to create and setup the renderer
  const createRenderer = () => {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    
    // Get fresh theme colors for initial setup
    const themeColors = getThemeColors();
    const backgroundHex = cssColorToHex(themeColors.baseBackground);
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(backgroundHex, 1);
    renderer.shadowMap.enabled = true; // Enable shadow mapping
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Use soft shadows
    // renderer.toneMapping = THREE.ACESFilmicToneMapping; // Use Reinhard tone mapping
    // renderer.toneMappingExposure = 1; // Adjust exposure as needed
    // Don't append to DOM yet - wait for animation to start
    return renderer;
  };
  // Function to handle intro animation
  const startIntroAnimation = (camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, scene: THREE.Scene) => {
    // Dev-only guard: skip the very first call (React StrictMode double-mount)
    try {
      if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
        const key = '__scrollSceneIntroSkipOnce__';
        if (!(window as any)[key]) {
          (window as any)[key] = true;
          console.log('[ScrollScene] Skipping first intro (dev StrictMode)');
          return;
        }
      }
    } catch {}

    // Prevent re-entry
    if (introStartedRef.current) return;
    introStartedRef.current = true;
    
    // Update intro end position to use current orbital height
    introAnimRef.current.toPos = new THREE.Vector3(35.36, storeOrbitalHeight, 35.36);
    console.log('🎬 [Intro] Updated end position to orbital height:', storeOrbitalHeight);
    
    // Create debug spheres for intro animation when showDebug is true
    if (showDebug && scene) {
      console.log('🎯 CREATING INTRO DEBUG SPHERES...');
      
      // Create purple sphere at the intro start position
      const startMarker = new THREE.Mesh(
        new THREE.SphereGeometry(1.5, 16, 16),
        new THREE.MeshBasicMaterial({ 
          color: 0x800080, // Purple color for intro start
          transparent: true, 
          opacity: 0.9 
        })
      );
      startMarker.position.copy(introAnimRef.current.fromPos);
      startMarker.name = 'debug_intro_start_marker';
      scene.add(startMarker);
      
      // Create cyan sphere at the intro end position
      const endMarker = new THREE.Mesh(
        new THREE.SphereGeometry(1.5, 16, 16),
        new THREE.MeshBasicMaterial({ 
          color: 0x00ffff, // Cyan color for intro end
          transparent: true, 
          opacity: 0.9 
        })
      );
      endMarker.position.copy(introAnimRef.current.toPos);
      endMarker.name = 'debug_intro_end_marker';
      scene.add(endMarker);
      
    } else if (!showDebug) {
      console.log('🎯 INTRO DEBUG SPHERES SKIPPED (showDebug disabled)');
    }

    // Clear any previously scheduled intro timer (ensure one-shot)
    if (introTimeoutRef.current) {
      clearTimeout(introTimeoutRef.current);
      introTimeoutRef.current = null;
    }
    // Call intro start callback
    onIntroStart?.();
    
    let step = 0;
    
    const animateStep = () => {
      if (step < ANIMATION_STEPS) {
        const t = step / ANIMATION_STEPS;
        
        // Apply easing function for smoother animation
        const easedT = 1 - Math.pow(1 - t, 1); // Ease-out cubic
        
        const { fromPos, toPos } = introAnimRef.current;
        
        const newPos = new THREE.Vector3(
          fromPos.x + (toPos.x - fromPos.x) * easedT,
          fromPos.y + (toPos.y - fromPos.y) * easedT,
          fromPos.z + (toPos.z - fromPos.z) * easedT
        );
        
        camera.position.copy(newPos);
        
        // Rotate around Y-axis (green axis) during intro
        camera.up.set(0, 1, 0); // Standard up vector to prevent tilting
        camera.lookAt(0, 10, 0);  // Look at model center height (matches orbital)
        
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
        // Ensure canvas is visible once intro starts
        if (renderer.domElement && renderer.domElement.style.opacity === '0') {
          renderer.domElement.style.opacity = '1';
        }
        renderer.render(scene, camera);
        // Update debug with live camera position
        if (setDebugInfo) {
          setDebugInfo((prev: any) => ({
            ...(prev || {}),
            cameraPos: [camera.position.x, camera.position.y, camera.position.z],
            // Preserve scroll data
            scrollTop: prev?.scrollTop || 0,
            scrollHeight: prev?.scrollHeight || 0,
            scrollPercentage: prev?.scrollPercentage || 0,
            progress: prev?.progress || 0,
            progressPercent: prev?.progressPercent || 0
          }));
        }
        
        step++;
        introTimeoutRef.current = window.setTimeout(animateStep, ANIMATION_STEP_INTERVAL);
      } else {
        // Ensure camera is exactly at INTRO_END_POS with correct FOV
        camera.position.copy(INTRO_END_POS);
        camera.lookAt(0, 10, 0);  // ✅ FIX: Match orbital lookAt height (not ground level)
        camera.fov = CAMERA_FOV;  // Ensure FOV matches orbital camera
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
        renderer.render(scene, camera);
        
        // Final intro camera position into debug
        if (setDebugInfo) {
          setDebugInfo((prev: any) => ({
            ...(prev || {}),
            cameraPos: [camera.position.x, camera.position.y, camera.position.z],
            // Preserve scroll data
            scrollTop: prev?.scrollTop || 0,
            scrollHeight: prev?.scrollHeight || 0,
            scrollPercentage: prev?.scrollPercentage || 0,
            progress: prev?.progress || 0,
            progressPercent: prev?.progressPercent || 0
          }));
        }

        // Clear timer ref
        if (introTimeoutRef.current) {
          clearTimeout(introTimeoutRef.current);
          introTimeoutRef.current = null;
        }

    // Clean up intro debug spheres when showDebug is true
    if (showDebug && scene) {
          scene.children.forEach((child: THREE.Object3D) => {
            if (child.name === 'debug_intro_start_marker' || child.name === 'debug_intro_end_marker') {
              scene.remove(child);
              console.log('🧹 Removed intro debug marker:', child.name);
            }
          });
        }
        
        // Intro completed, enable orbital animation
        introCompletedRef.current = true;
        hasIntroRef.current = true;
        onIntroComplete?.(); // Call intro complete callback
        introCompletedRef.current = true; // Mark intro as completed
        console.log('✅ Intro completed - Orbital camera starting');
        
        // CRITICAL: Update journeyStartPosition to reflect where intro actually ended
        // This ensures the panel shows the correct main path position
        if (cameraStateRef.current) {
          cameraStateRef.current.journeyStartPosition.copy(INTRO_END_POS);
          cameraStateRef.current.mainPathPosition.copy(INTRO_END_POS);
        }

        // Initialize GSAP curve to start at first camera path point
        if (cameraRef.current && rendererRef.current && sceneRef.current) {
          // Only create curve if we have valid camera points
          if (gsapCameraPoints && gsapCameraPoints.length > 0) {
            // Use the camera points directly without prepending current position
            gsapCurveRef.current = new THREE.CatmullRomCurve3(gsapCameraPoints, false, 'catmullrom', 0.1);
            
            // Set camera to the first point of the path
            const firstPoint = gsapCameraPoints[0];
            console.log('🌀 [Orbital Start] First waypoint position:', {
              x: firstPoint.x.toFixed(2),
              y: firstPoint.y.toFixed(2),
              z: firstPoint.z.toFixed(2)
            });
            console.log('🌀 [Orbital Start] INTRO_END_POS:', {
              x: INTRO_END_POS.x.toFixed(2),
              y: INTRO_END_POS.y.toFixed(2),
              z: INTRO_END_POS.z.toFixed(2)
            });
            console.log('🌀 [Orbital Start] Store orbital height:', storeOrbitalHeight);
            camera.position.copy(firstPoint);
          } else {
            return; // Skip intro if no valid path
          }
          // Build a smooth look-at curve
          const lookPts = gsapLookAtTargets;
          gsapLookAtTargetsRef.current = lookPts;
          gsapLookCurveRef.current = new THREE.CatmullRomCurve3(lookPts, false, 'catmullrom', 0.1);
          gsapPathInitializedRef.current = true;
          pathProgressRef.current.t = 0;
          // Add visible path in the scene
          console.log('🎨 [Intro Complete] Calling addPathVisuals with curve:', gsapCurveRef.current);
          addPathVisuals(gsapCurveRef.current);
          // Render first frame of path immediately
          updateCameraAlongCurve(cameraRef.current, 0);
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      }
    };
    
    // Kick off the intro immediately (no initial static frame)
    introTimeoutRef.current = window.setTimeout(animateStep, 0);
  };

  // Function to handle orbital animation
  const animateOrbital = (camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, scene: THREE.Scene) => {
    // Set start time on first call
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    }
    
    // TIME-BASED orbital animation (infinite rotation, ignore scroll)
    const elapsedTime = (Date.now() - startTimeRef.current) * 0.001;
    const angle = (elapsedTime * ORBITAL_SPEED);
    const radius = 50; // Distance from center
    
    // Update scroll progress for marker descriptions (but don't use it for camera)
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
    const progressPercent = progress * 100;
    setScrollProgress(progress);
    
    // Calculate orbital position
    const orbitalX = Math.cos(angle) * radius;
    const orbitalZ = Math.sin(angle) * radius;
    const orbitalY = ORBITAL_HEIGHT;
    
    // Move camera in orbital path
    camera.position.set(orbitalX, orbitalY, orbitalZ);
    
    // Always look at the cube center
    camera.lookAt(cubePos.current);
    
    // Keep field of view constant
    camera.fov = CAMERA_FOV;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    
    // Update debug information
    setDebugInfo((prev: any) => ({
      ...(prev || {}),
      cameraPos: [orbitalX, orbitalY, orbitalZ],
      scrollTop,
      scrollHeight,
      progress,
      progressPercent,
      scrollPercentage: progressPercent,
      windowHeight: window.innerHeight,
      windowWidth: window.innerWidth,
      currentSection
    }));
    
    // Render the scene
    // Clear any existing content and ensure full viewport coverage
    if (mountRef.current) {
      // Remove any existing children
      while (mountRef.current.firstChild) {
        mountRef.current.removeChild(mountRef.current.firstChild);
      }
      // Re-append renderer to ensure it's the only content
      mountRef.current.appendChild(renderer.domElement);
      // Ensure full viewport coverage
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    renderer.render(scene, camera);
  };
  // Now using React state and LoaderOverlay component instead

  const updateLoaderOverlayProgress = (evt: ProgressEvent<EventTarget>) => {
    const totalKnown = !!loaderTotalBytesRef.current && loaderTotalBytesRef.current > 0;

    if ((evt as ProgressEvent).lengthComputable && (evt as ProgressEvent).total > 0) {
      const loaded = (evt as ProgressEvent).loaded;
      const total = (evt as ProgressEvent).total;
      loaderLoadedBytesRef.current = loaded;
      loaderTotalBytesRef.current = total;
      const percent = (loaded / total) * 100;
      setLoaderPercent(percent);
      setLoaderLoadedMB(loaded / 1024 / 1024);
      setLoaderTotalMB(total / 1024 / 1024);
    } else if (totalKnown) {
      // Use known total even if event is not lengthComputable
      const loaded = typeof (evt as ProgressEvent).loaded === 'number' ? (evt as ProgressEvent).loaded : loaderLoadedBytesRef.current;
      loaderLoadedBytesRef.current = loaded;
      const total = loaderTotalBytesRef.current as number;
      const percent = Math.min(99, (loaded / total) * 100);
      setLoaderPercent(percent);
      setLoaderLoadedMB(loaded / 1024 / 1024);
      setLoaderTotalMB(total / 1024 / 1024);
    } else {
      // indeterminate mode: show MB loaded
      const loaded = (evt as ProgressEvent).loaded || 0;
      loaderLoadedBytesRef.current = loaded;
      setLoaderPercent(50); // Mid-progress for indeterminate
      setLoaderLoadedMB(loaded / 1024 / 1024);
      setLoaderTotalMB(null);
    }
  };


  // Theme change listener
  useEffect(() => {
    const handleThemeChange = () => {
      if (rendererRef.current && sceneRef.current) {
        // Get fresh theme colors on each theme change
        const themeColors = getThemeColors();
        const backgroundHex = cssColorToHex(themeColors.baseBackground);
        
        const colors = {
          BACKGROUND_COLOR: backgroundHex,
          FLOOR_COLOR: themeColors.isDark ? 0x1f2937 : 0xccc1b1,
          WALL_COLOR: themeColors.isDark ? 0x04070E : 0xffffff,
          CUBE_COLOR: 0x00ff00,
          CUBE_EMISSIVE_COLOR: 0x003300,
          GRID_COLOR_MAJOR: themeColors.isDark ? 0x444444 : 0x888888,
          GRID_COLOR_MINOR: themeColors.isDark ? 0x222222 : 0xcccccc,
          AXES_COLOR: themeColors.isDark ? 0x666666 : 0x333333,
          HOTSPOT_NORMAL_COLOR: 0xffffff,
        };
        
        console.log('🎨 ScrollScene Theme Change:', {
          isDark: themeColors.isDark,
          backgroundHex: backgroundHex.toString(16),
          backgroundColor: colors.BACKGROUND_COLOR
        });
        
        rendererRef.current.setClearColor(colors.BACKGROUND_COLOR);
        
        // Update scene materials
        sceneRef.current.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh && child.material) {
            if (child.geometry instanceof THREE.PlaneGeometry) {
              // Update floor and walls
              if (child.position.y === FLOOR_Y_POSITION) {
                child.material.color.setHex(colors.FLOOR_COLOR);
              } else {
                child.material.color.setHex(colors.WALL_COLOR);
              }
            } else if (child.geometry instanceof THREE.BoxGeometry) {
              // Update cube
              child.material.color.setHex(colors.CUBE_COLOR);
              child.material.emissive.setHex(colors.CUBE_EMISSIVE_COLOR);
            }
          }
        });
        
        // Update grid helper colors
        sceneRef.current.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.GridHelper) {
            child.material.color.setHex(colors.GRID_COLOR_MAJOR);
            child.material.opacity = 0.8;
          }
        });
        
        // Force a render update
        if (cameraRef.current) {
          // Don't force a render that would show a pre-intro still
          if (!WITH_INTRO || introCompletedRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
          }
        }
      }
    };

    // Initial theme setup
    handleThemeChange();

    // Listen for theme changes
    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // Expose camera, renderer, and scene refs to Zustand store and window
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Set Zustand store refs (primary method for CameraPathEditor3D)
    if (cameraRef.current) {
      setStoreCameraRef(cameraRef.current)
    }
    if (rendererRef.current) {
      setStoreRendererRef(rendererRef.current)
    }
    if (sceneRef.current) {
      setStoreSceneRef(sceneRef.current)
    }
    
    // Also set window globals for backward compatibility
    if (cameraRef.current) {
      (window as any).sceneEditorCamera = cameraRef.current
    }
    if (rendererRef.current) {
      (window as any).sceneEditorRenderer = rendererRef.current
    }
    if (sceneRef.current) {
      (window as any).sceneEditorScene = sceneRef.current
    }
  }, [setStoreCameraRef, setStoreRendererRef, setStoreSceneRef]);

  // Expose bird view state globally for DockedNavigation
  useEffect(() => {
    (window as any).__isBirdView = isBirdView;
  }, [isBirdView]);

  // Main animation loop
  const animate = (camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, scene: THREE.Scene) => {
    // CRITICAL: Skip camera updates during waypoint dragging but keep loop running
    const pauseLoop = (window as any)?.__pauseAnimationLoop === true;
    if (pauseLoop) {
      // Keep loop running but skip all camera position updates
      // Only render current state
      renderer.render(scene, camera);
      animationIdRef.current = requestAnimationFrame(() => animate(camera, renderer, scene));
      return;
    }
    
    // Append renderer to DOM on first frame to prevent static render
    if (!renderer.domElement.parentNode) {
      mountRef.current?.appendChild(renderer.domElement);
    }
    
    // Camera position is now controlled by GSAP bezier animation
    // No need for global position monitoring that interferes with smooth movement
    
    // Declare bird view state once for the entire function
    const isInBirdView = isBirdViewRef.current || (window as any).__isBirdView === true;
    
    // If bird view is locked, ensure we remain in bird view state
    const birdViewLocked = (typeof window !== 'undefined' && (window as any).__birdViewLocked === true);
    if (birdViewLocked && !isInBirdView) {
      setIsBirdView(true);
    }
    // Don't initialize GSAP curve if we're focused on a hotspot
    if (introCompletedRef.current && !gsapPathInitializedRef.current && cameraRef.current && !isFocusedOnHotspot) {
      // Only create curve if we have valid camera points
      if (gsapCameraPoints && gsapCameraPoints.length > 0) {
        // Use the camera points directly without prepending current position
        gsapCurveRef.current = new THREE.CatmullRomCurve3(gsapCameraPoints, false, 'catmullrom', 0.1);
        
        // Set camera to the first point of the path to avoid jump
        const firstPoint = gsapCameraPoints[0];
        camera.position.copy(firstPoint);
      } else {
        return; // Skip path initialization if no valid path
      }
      const lookPts = gsapLookAtTargets;
      gsapLookAtTargetsRef.current = lookPts;
      gsapLookCurveRef.current = new THREE.CatmullRomCurve3(lookPts, false, 'catmullrom', 0.1);
      gsapPathInitializedRef.current = true;
      pathProgressRef.current.t = 0;
    }
    
    // COMPLETELY DISABLE ALL ANIMATION SYSTEMS when focused on hotspots
    if (isFocusedOnHotspot) {
      // Force disable all path systems to prevent camera position overrides
      gsapPathInitializedRef.current = false;
      pathProgressRef.current.t = 0;
      
      // When focused on hotspot, ONLY render the scene - NO camera movement
      if (!isAnimatingRef.current) {
        // Ensure camera is looking at the clicked hotspot target
        if (clickedHotspot) {
          const target = new THREE.Vector3();
          clickedHotspot.getWorldPosition(target);
          camera.lookAt(target);
          camera.updateMatrixWorld();
          
          // Camera position is controlled by GSAP bezier animation
          // No need for aggressive position enforcement
        }
        
        // Handle bird view rendering
        if (isInBirdView || isTestingCameraRef.current) {
          if (isInBirdView && !isTestingCameraRef.current && cameraRef.current) {
            const currentPos = cameraRef.current.position;
            const distanceToIntro = currentPos.distanceTo(INTRO_START_POS);
            if (distanceToIntro > 0.1) {
              cameraRef.current.position.copy(INTRO_START_POS);
              cameraRef.current.lookAt(0, 0, 0);
            }
          }
          renderer.render(scene, camera);
          return;
        }

        // Single render call when not animating
        renderer.render(scene, camera);
      } else {
        // During animation, don't render here - let the bezier animation control rendering
        // This prevents flickering from multiple render calls
      }
      
      // CRITICAL: Skip the rest of the animation loop when focused on hotspots
      // This prevents orbital/GSAP systems from interfering with hotspot animations
      animationIdRef.current = requestAnimationFrame(() => animate(camera, renderer, scene));
      return;
    }
    
    // Only run orbital/GSAP animations when NOT focused on hotspots AND not animating AND not in bird view
    if (!isAnimatingRef.current && !isFocusedOnHotspotRef.current && !isInBirdView && !isTestingCameraRef.current && !isAnimatingToBirdView.current && !isAnimatingFromBirdView.current) {
      if (introCompletedRef.current || !WITH_INTRO) {
        // Handle bird view rendering first (before scroll path)
        const birdViewLocked = (window as any)?.__birdViewLocked === true;
        if (isInBirdView || isTestingCameraRef.current) {
          if (isInBirdView && !isTestingCameraRef.current && cameraRef.current) {
            const currentPos = cameraRef.current.position;
            const distanceToIntro = currentPos.distanceTo(INTRO_START_POS);
            if (distanceToIntro > 0.1) {
              cameraRef.current.position.copy(INTRO_START_POS);
              cameraRef.current.lookAt(0, 0, 0);
            }
          }
          renderer.render(scene, camera);
          return;
        }
        
        // Camera animation based on camera type
        const suppressResume = (window as any)?.__suppressCameraResume === true;
        if (!birdViewLocked && !suppressResume) {
          if (storeCameraType === 'orbital') {
            // ORBITAL MODE: Auto-increment progress for continuous rotation
            const autoSpeed = 0.001; // Speed of rotation (higher = faster)
            pathProgressRef.current.t = (pathProgressRef.current.t + autoSpeed) % 1.0;
          } else {
            // PATH MODE: Use actual scroll position
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
            pathProgressRef.current.t = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
          }
          
          // Use same curve system for both modes
          updateCameraAlongCurve(camera, pathProgressRef.current.t);
        }
        
        // Update main path position
        cameraStateRef.current.mainPathPosition.copy(camera.position);
        cameraStateRef.current.isOnMainPath = true;
        
        renderer.render(scene, camera);
      }
    }
    
    // Ensure pulse markers are always visible (mobile only)
    if (isMobile.detect()) {
      if (hotspotPulseRefs.current.length > 0) {
        ensurePulseMarkersVisible();
      } else if (clickableObjectsRef.current.length > 0 && !pulseMarkersCreatedRef.current) {
        // If pulse markers are missing but hotspots exist, recreate them
        console.log('🔍 Pulse markers missing in animation loop, recreating');
        createHotspotPulseMarkers();
      }
    }
    
    // Continue animation loop
    animationIdRef.current = requestAnimationFrame(() => animate(camera, renderer, scene));
  };

  // Start pulse animation if not already running
  useEffect(() => {
    if (hotspotPulseRefs.current.length > 0 && !pulseAnimationRef.current) {
      animateHotspotPulses();
    }
    
    return () => {
      stopPulseAnimation();
    };
  }, [hotspotPulseRefs.current.length]);



  // Resize handler
  const handleResize = (camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  // Main useEffect for scene setup
  useEffect(() => {
    if (!mountRef.current) return;

    // Create scene, camera, and renderer
    const scene = createScene();
    const camera = createCamera();
    const renderer = createRenderer();
    
    // Store references
    cameraRef.current = camera;
    sceneRef.current = scene;
    rendererRef.current = renderer;
    
    // Initialize raycaster for hotspot interaction
    raycasterRef.current = new THREE.Raycaster();
    
    // Initial render and animation setup
    if (WITH_INTRO) {
      // Defer intro until model is loaded so only the in-scene intro plays
      console.log('[ScrollScene] Deferring intro until model loads');
    } else {
      // Skip intro, go straight to orbital
      introCompletedRef.current = true;
      hasIntroRef.current = true;
      console.log('Skipping intro, going straight to orbital animation');
    }

    // Defer GSAP preview; will start after intro completes
    
    // Start animation loop
    animate(camera, renderer, scene);
    
    // Fallback: if intro didn't start within 3s after mount/model init, trigger it
    if (WITH_INTRO) {
      window.setTimeout(() => {
        if (!introStartedRef.current && !introCompletedRef.current && cameraRef.current && rendererRef.current && sceneRef.current) {
          console.log('[ScrollScene] Intro fallback trigger after timeout');
          startIntroAnimation(cameraRef.current, rendererRef.current, sceneRef.current);
        }
      }, 3000);
    }

    // Add resize listener
    const resizeHandler = () => handleResize(camera, renderer);
    window.addEventListener("resize", resizeHandler);

    // Attach renderer canvas once and cover the full viewport
    if (mountRef.current) {
      while (mountRef.current.firstChild) mountRef.current.removeChild(mountRef.current.firstChild);
      renderer.setSize(window.innerWidth, window.innerHeight);
      const canvas = renderer.domElement as HTMLCanvasElement;
      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      // Hide canvas until intro actually starts to avoid showing pre-intro still
      if (WITH_INTRO) canvas.style.opacity = '0';
      mountRef.current.appendChild(canvas);
    }

    // Cleanup
    return () => {
      window.removeEventListener("resize", resizeHandler);
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      removePathVisuals();
      renderer.dispose();
      // Clean up pulse markers
      cleanupPulseMarkers();
      stopPulseAnimation();
    };
  }, []);

  // Throttle for scroll logging
  const lastPathLogTsRef = useRef<number>(0);

  useEffect(() => {
    const onScroll = () => {
      // Scroll guard: Temporarily disable Bird View during scroll, remember previous state
      // Only disable if bird view is active, not locked, and we're not animating TO or FROM bird view
      const birdViewLocked = (window as any)?.__birdViewLocked === true;
      if (birdViewLocked) {
        // When locked, never toggle Bird View off due to scroll
        setWasBirdViewActiveBeforeScroll(false);
        return;
      }
      // Use ref first, then fallback to global window variable for immediate access
      const isInBirdView = isBirdViewRef.current || (window as any).__isBirdView === true;
      if (isInBirdView && !isAnimatingRef.current && !isAnimatingToBirdView.current && !isAnimatingFromBirdView.current) {
        // Preserve Bird View state; mark that it was active prior to scroll
        setWasBirdViewActiveBeforeScroll(true);
        // Do NOT toggle Bird View off here to ensure persistence
      }

      const doc = document.documentElement;
      const st = window.pageYOffset || doc.scrollTop;
      const sh = (doc.scrollHeight - window.innerHeight) || 0;
      const targetT = sh > 0 ? st / sh : pathProgressRef.current.t;
      const t = Math.max(0, Math.min(1, targetT));
      // tween toward target for smoothness with higher precision
      gsap.to(pathProgressRef.current, {
        t: parseFloat(t.toFixed(6)), // Higher precision for spline positioning
        duration: 0.4,
        ease: 'power2.out',
        onUpdate: () => {
          // CRITICAL: Don't update camera position during hotspot animations
          // Use ref first, then fallback to global window variable for immediate access
          const isInBirdView = isBirdViewRef.current || (window as any).__isBirdView === true;
          if (introCompletedRef.current && cameraRef.current && sceneRef.current && rendererRef.current && !isFocusedOnHotspotRef.current && !isInBirdView) {
            updateCameraAlongCurve(cameraRef.current, pathProgressRef.current.t);
            rendererRef.current.render(sceneRef.current, cameraRef.current);
            
            // GLOBAL: Update main path position reference for debugging
            cameraStateRef.current.mainPathPosition.copy(cameraRef.current.position);
            
            // GLOBAL: Update journey start position when on main path
            if (cameraStateRef.current.isOnMainPath) {
              cameraStateRef.current.journeyStartPosition.copy(cameraRef.current.position);
            }
          }
        },
      });
      if (setDebugInfo) {
        const scrollPercentage = sh > 0 ? (st / sh) * 100 : 0;
        setDebugInfo((prev: any) => ({ 
          ...(prev || {}), 
          progress: t, 
          progressPercent: t * 100,
          scrollTop: st,
          scrollHeight: sh,
          scrollPercentage: scrollPercentage
        }));
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true } as any);
    onScroll(); // Call once to capture initial state
    
    return () => {
      window.removeEventListener('scroll', onScroll as any);
    };
  }, [isBirdView]);

  // Scroll detection (NO auto-switching - button controls camera type only)
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      // Set scrolling flag
      (window as any).__isScrolling = true;
      
      // Clear previous timeout
      clearTimeout(scrollTimeout);
      
      // Set timeout to detect scroll end
      scrollTimeout = setTimeout(() => {
        // Clear scrolling flag
        (window as any).__isScrolling = false;
        
        // Restore Bird View if it was active before scroll
        if (wasBirdViewActiveBeforeScroll) {
          setIsBirdView(true);
          setWasBirdViewActiveBeforeScroll(false);
        }
      }, 150); // Wait 150ms after scroll stops
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      clearTimeout(scrollTimeout);
      window.removeEventListener('scroll', handleScroll);
      (window as any).__isScrolling = false;
    };
  }, [wasBirdViewActiveBeforeScroll]);
  // Bird view animation handler
  useEffect(() => {
    const handleBirdViewAnimation = (event: CustomEvent) => {
      console.log('🎯 [ScrollScene] Bird view animation event received, current isBirdView:', isBirdView);
      console.log('🎯 [ScrollScene] Event detail:', event.detail);
      
      const newBirdViewState = event.detail.isBirdView;
      console.log('🎯 [ScrollScene] Setting new bird view state to:', newBirdViewState);
      const birdViewLocked = (typeof window !== 'undefined' && (window as any).__birdViewLocked === true);

      // If locked, ignore requests to switch back to camera view
      if (!newBirdViewState && birdViewLocked) {
        console.log('🔒 [ScrollScene] Bird view is locked - ignoring switch to camera view');
        return;
      }
      
      if (newBirdViewState) {
        // Going TO bird view - set state immediately
        console.log('🎯 [ScrollScene] Setting isBirdView to true in handler');
        setIsBirdView(newBirdViewState);
        isBirdViewRef.current = newBirdViewState;
        // Also set global window variable for immediate access
        (window as any).__isBirdView = newBirdViewState;
        // Set persistent flag to prevent automatic return to camera view
        (window as any).__birdViewPersistent = true;
        // Store spline follow-path position and lookAt to return precisely later
        if (cameraRef.current) {
          // Save current spline progress with high precision
          if (introCompletedRef.current) {
            cameraStateRef.current.savedSplineProgress = parseFloat(pathProgressRef.current.t.toFixed(6));
            if (gsapCurveRef.current) {
              const exactSplinePosition = gsapCurveRef.current.getPointAt(cameraStateRef.current.savedSplineProgress);
              cameraStateRef.current.exactSplinePosition = exactSplinePosition.clone();
            } else {
              cameraStateRef.current.exactSplinePosition = cameraRef.current.position.clone();
            }

            // Save a robust lookAt target
            let savedLookAt: THREE.Vector3 | null = null;
            const currentLookDir = new THREE.Vector3();
            cameraRef.current.getWorldDirection(currentLookDir);
            const currentLookAtTarget = cameraRef.current.position.clone().add(currentLookDir.multiplyScalar(10));
            savedLookAt = currentLookAtTarget;
            if (!savedLookAt && gsapLookAtTargetsRef.current && gsapLookAtTargetsRef.current.length > 0) {
              const idx = Math.floor(cameraStateRef.current.savedSplineProgress * (gsapLookAtTargetsRef.current.length - 1));
              savedLookAt = gsapLookAtTargetsRef.current[Math.max(0, Math.min(idx, gsapLookAtTargetsRef.current.length - 1))];
            }
            cameraStateRef.current.savedLookAtTarget = (savedLookAt || cubePos.current || new THREE.Vector3(0, 0, 0)).clone();
          }
        }
        
        // Animate to bird view position
        console.log('🎯 [ScrollScene] Starting animation to bird view position:', INTRO_START_POS);
        console.log('🎯 [ScrollScene] Current camera position:', cameraRef.current?.position);
        console.log('🎯 [ScrollScene] GSAP available:', typeof gsap);
        isAnimatingToBirdView.current = true;
        isAnimatingRef.current = true; // Set animation flag to prevent scroll guard interference
        if (cameraRef.current) {
          try {
            const tween = gsap.to(cameraRef.current.position, {
              x: INTRO_START_POS.x,
              y: INTRO_START_POS.y,
              z: INTRO_START_POS.z,
              duration: 1.5,
              ease: "power2.inOut",
              onUpdate: () => {
                if (cameraRef.current) {
                  cameraRef.current.lookAt(0, 0, 0);
                  // Force render during animation to show movement
                  if (rendererRef.current && sceneRef.current) {
                    rendererRef.current.render(sceneRef.current, cameraRef.current);
                  }
                }
              },
              onComplete: () => {
                console.log('🎯 [SceneEditor] Bird view animation completed');
                isAnimatingToBirdView.current = false;
                isAnimatingRef.current = false;
                isTestingCameraRef.current = false;
                
                // Sync state to store (in case it was triggered from legacy code)
                if (storeBirdView !== true) {
                  setStoreBirdView(true)
                  console.log('🎯 [SceneEditor] Synced bird view state to store: true')
                }
                
                // Update local state for persistence
                setIsBirdView(true);
                isBirdViewRef.current = true;
                (window as any).__isBirdView = true;
                console.log('🎯 [SceneEditor] Bird view state set to true for persistence');
              }
            });
            console.log('🎯 [ScrollScene] GSAP tween created:', tween);
          } catch (error) {
            console.error('❌ [ScrollScene] GSAP animation error:', error);
          }
        } else {
          console.log('❌ [ScrollScene] cameraRef.current is null, cannot animate to bird view');
        }
      } else {
        // For bird view persistence, don't animate back unless explicitly requested
        console.log('🎯 [ScrollScene] Request to return to follow-path - checking persistence');
        
        // If bird view is locked, prevent switching back to camera view
        if (storeBirdViewLocked) {
          console.log('🔒 [SceneEditor] Bird view locked - skipping return to follow-path');
          return;
        }
        
        // Animate back to the saved follow-path position
        console.log('🎯 [ScrollScene] Starting animation back to follow-path position');
        isAnimatingFromBirdView.current = true;
        if (cameraRef.current) {
          // Resolve target follow-path position and lookAt
          const targetPos = (cameraStateRef.current.exactSplinePosition?.clone())
            || (gsapCurveRef.current ? gsapCurveRef.current.getPointAt(cameraStateRef.current.savedSplineProgress) : null)
            || cameraStateRef.current.mainPathPosition.clone();
          const targetLookAt = (cameraStateRef.current.savedLookAtTarget?.clone()) || (cubePos.current ? cubePos.current.clone() : new THREE.Vector3(0, 0, 0));
          
          console.log('🎯 [ScrollScene] Target position:', targetPos);
          console.log('🎯 [ScrollScene] Target lookAt:', targetLookAt);

          try {
            const tween = gsap.to(cameraRef.current.position, {
              x: targetPos.x,
              y: targetPos.y,
              z: targetPos.z,
              duration: 1.5,
              ease: "power2.inOut",
              onUpdate: () => {
                if (cameraRef.current) {
                  cameraRef.current.lookAt(targetLookAt);
                  // Force render during animation to show movement
                  if (rendererRef.current && sceneRef.current) {
                    rendererRef.current.render(sceneRef.current, cameraRef.current);
                  }
                }
              },
              onComplete: () => {
                console.log('🎯 [SceneEditor] Return to follow-path animation completed');
                isAnimatingFromBirdView.current = false;
                isTestingCameraRef.current = false;
                
                // Sync state to store
                if (storeBirdView !== false) {
                  setStoreBirdView(false)
                  console.log('🎯 [SceneEditor] Synced bird view state to store: false')
                }
                
                // Update local state
                setIsBirdView(false);
                isBirdViewRef.current = false;
                (window as any).__isBirdView = false;
                (window as any).__birdViewPersistent = false;
                
                // Ensure camera resumes along the spline at saved t
                if (introCompletedRef.current && cameraRef.current && sceneRef.current && rendererRef.current) {
                  if (!isFocusedOnHotspotRef.current) {
                    updateCameraAlongCurve(cameraRef.current, cameraStateRef.current.savedSplineProgress || pathProgressRef.current.t);
                  }
                  rendererRef.current.render(sceneRef.current, cameraRef.current);
                }
                cameraStateRef.current.isOnMainPath = true;
              }
            });
            console.log('🎯 [ScrollScene] Return animation GSAP tween created:', tween);
          } catch (error) {
            console.error('❌ [ScrollScene] Return animation GSAP error:', error);
          }
        }
      }
    };

    const loadCollaborativeSceneConfig = async (sceneConfigId: string) => {
      try {
        console.log('🤝 [ScrollScene] Loading collaborative scene config:', sceneConfigId);
        
        // Check if this config is already loaded
        if (userSceneConfig?.id === sceneConfigId) {
          console.log('🤝 [ScrollScene] Scene config already loaded, skipping reload');
          return;
        }
        
        // Clear existing model before loading new config
        clearCurrentModel();
        
        // Show loader immediately (FIX for hang at 0%)
        setShowLoader(true);
        setLoaderPercent(0);
        setLoaderLoadedMB(0);
        setLoaderTotalMB(null);
        
        // Get the scene config directly by ID using the service
        const sceneConfigService = SceneConfigService.getInstance();
        const config = await sceneConfigService.getConfigById(sceneConfigId);

        console.log('🤝 [ScrollScene] Query result - config:', config);

        if (!config) {
          console.error('🤝 [ScrollScene] Scene config not found:', sceneConfigId);
          return;
        }

        console.log('🤝 [ScrollScene] Loaded scene config:', config.config_name);
        console.log('🤝 [ScrollScene] Model path from config:', (config as any).model_path);
        
        // Get the active follow path for this config
        const followPath = await sceneConfigService.getActiveFollowPathForConfig(config.id);
        
        console.log('🤝 [ScrollScene] Follow path:', followPath);

        if (followPath && (config as any).model_path) {
          // Transform the config to include model_path in the expected format
          const transformedConfig = {
            ...config,
            model_path: (config as any).model_path,
            DEFAULT_MODEL_PATH: (config as any).model_path
          };
          
          // CRITICAL: Reset first load flag so the model actually loads
          isFirstConfigLoad.current = false;
          
          // Update the scene config with the transformed config
          setUserSceneConfig(transformedConfig as any);
          
          // Update camera path data and sync to Zustand
          setCameraPathData({
            cameraPoints: followPath.camera_points || [],
            lookAtTargets: followPath.look_at_targets || []
          });
          
          // Store original architect path for toggling
          originalArchitectPathRef.current = {
            cameraPoints: followPath.camera_points || [],
            lookAtTargets: followPath.look_at_targets || []
          };
          
          // CRITICAL: Sync to Zustand store immediately
          setStoreCameraPoints(followPath.camera_points || [])
          setStoreLookAtTargets(followPath.look_at_targets || [])
          console.log('💾 [SceneEditor] Saved architect path for toggle:', followPath.camera_points?.length, 'waypoints');
          
          console.log('✅ [ScrollScene] Collaborative model loaded successfully!');
          console.log('✅ [ScrollScene] Config:', config.config_name);
          console.log('✅ [ScrollScene] Model path:', (config as any).model_path);
          console.log('✅ [ScrollScene] Using path:', followPath.path_name);
          console.log('✅ [ScrollScene] Camera waypoints:', followPath.camera_points?.length || 0);
          console.log('✅ [ScrollScene] LookAt targets:', followPath.look_at_targets?.length || 0);
          console.log('✅ [ScrollScene] Orbital height from config:', config.orbital_height);
          console.log('✅ [ScrollScene] Synced to Zustand store');
          
          // Verify the orbital configuration
          if (followPath.camera_points && followPath.camera_points.length > 0) {
            const firstPoint = followPath.camera_points[0]
            console.log('🎯 [ScrollScene] First waypoint position:', firstPoint)
            console.log('🎯 [ScrollScene] Camera will orbit at height:', firstPoint.y)
          }
          
          console.log('🎯 [ScrollScene] ========== MODEL LOAD COMPLETE ==========');
          console.log('🎯 [ScrollScene] Model should now load and start orbital animation');
        } else {
          console.error('❌ [ScrollScene] Missing follow path or model path:', {
            hasFollowPath: !!followPath,
            modelPath: (config as any).model_path
          });
        }
      } catch (error) {
        console.error('🤝 [ScrollScene] Error loading collaborative scene config:', error);
      }
    };

    const loadUploadedModel = async (modelPath: string, projectName?: string) => {
      try {
        console.log('📤 [ScrollScene] Loading uploaded model:', modelPath);
        
        if (!sceneRef.current) {
          console.warn('📤 [ScrollScene] Scene not ready for model loading');
          return;
        }
        
        // Reset first load flag so future config updates work normally
        isFirstConfigLoad.current = false;

        // Clear existing model first
        clearCurrentModel();

        // Show loader immediately
        setShowLoader(true);
        setLoaderPercent(0);
        setLoaderLoadedMB(0);
        setLoaderTotalMB(null);

        const modelLoader = ModelLoader.getInstance();
        
        console.log('📤 [ScrollScene] Model loading details:');
        console.log('  - Model Path:', modelPath);
        console.log('  - Project Name:', projectName || 'Unknown');
        
        const result = await modelLoader.loadModel({
          modelPath,
          targetSize: SCENE_CONFIG.TARGET_SIZE,
          rotationY: SCENE_CONFIG.ROTATION_Y,
          scaleMultiplier: SCENE_CONFIG.SCALE_MULTIPLIER,
          enableContourEdges: true,
          forceReload: true,  // Always reload uploaded models to detect hotspots
          enableShadows: true,
          onProgress: (progress, loaded, total) => {
            setLoaderPercent(progress);
            setLoaderLoadedMB(loaded / 1024 / 1024);
            setLoaderTotalMB(total ? total / 1024 / 1024 : null);
          },
          onComplete: () => {
            setShowLoader(false);
          },
          onError: (error) => {
            console.error('📤 [ScrollScene] ModelLoader error:', error);
            setShowLoader(false);
            createFloorPlanPlaceholder();
          }
        });

        const { model, clickableObjects, boundingSphere } = result;
        
        // Add model to scene
        if (sceneRef.current && model) {
          sceneRef.current.add(model);
          modelRef.current = model;
          console.log('📤 [ScrollScene] Model added to scene');
        }
        
        // Store hotspots for interaction
        clickableObjectsRef.current = clickableObjects;
        
        console.log('📤 [ScrollScene] Uploaded model loaded successfully:', {
          modelPath,
          projectName,
          hotspotsFound: clickableObjects.length
        });
        
        // Re-add path visuals after loading new model
        if (gsapCurveRef.current) {
          console.log('🎨 [loadUploadedModel] Re-adding path visuals after model load');
          addPathVisuals(gsapCurveRef.current);
          
          // Force render to show path visuals and model
          if (rendererRef.current && cameraRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
          }
        }
        
      } catch (error) {
        console.error('📤 [ScrollScene] Error loading uploaded model:', error);
        setShowLoader(false);
      }
    };

    const handleLoadCollaborativeModel = (event: CustomEvent) => {
      console.log('🤝 [ScrollScene] ========== LOAD COLLABORATIVE MODEL EVENT ==========');
      console.log('🤝 [ScrollScene] Event detail:', event.detail);
      
      const { sceneConfigId, clientId, enableCameraControls } = event.detail;
      
      if (!sceneConfigId) {
        console.error('❌ [ScrollScene] No scene config ID provided in event');
        return;
      }
      
      console.log('🤝 [ScrollScene] Loading scene config:', sceneConfigId);
      console.log('🤝 [ScrollScene] Client ID:', clientId);
      console.log('🤝 [ScrollScene] Enable controls:', enableCameraControls);
      
      // Load the scene configuration by ID
      loadCollaborativeSceneConfig(sceneConfigId);
      
      // Enable camera controls if requested (for architect editing)
      if (enableCameraControls) {
        console.log('🎛️ [ScrollScene] Enabling camera controls for architect');
        
        // Enable editor mode in Zustand store (this will enable CameraPathEditor3D)
        const { setIsEditorEnabled } = useCameraStore.getState();
        setIsEditorEnabled(true);
        
        console.log('✅ [ScrollScene] Camera controls enabled');
      } else {
        console.log('👁️ [ScrollScene] View-only mode (no camera controls)');
      }
      
      console.log('🤝 [ScrollScene] ========== EVENT PROCESSING COMPLETE ==========');
    };

    const handleLoadUploadedModel = (event: CustomEvent) => {
      console.log('📤 [ScrollScene] ========== LOAD UPLOADED MODEL EVENT ==========');
      console.log('📤 [ScrollScene] Event detail:', event.detail);
      
      const { modelPath, projectName, assetId, rawModelOnly } = event.detail;
      
      if (!modelPath) {
        console.error('❌ [ScrollScene] No model path provided in event');
        return;
      }
      
      if (rawModelOnly) {
        console.log('📦 [ScrollScene] RAW MODEL MODE - Loading without architect customizations');
        console.log('📦 [ScrollScene] Model path:', modelPath);
        console.log('📦 [ScrollScene] No hotspots, no custom paths, just the uploaded file');
      } else {
        console.log('🎨 [ScrollScene] FULL MODE - Loading with all customizations');
      }
      
      // Load the uploaded model directly
      loadUploadedModel(modelPath, projectName);
      
      console.log('📤 [ScrollScene] ========== EVENT PROCESSING COMPLETE ==========');
    };

    
    const handleReloadCurrentModel = (event: any) => {
      console.log('🔄 [ScrollScene] Reload current model event received:', event.detail);
      // Trigger a reload of the model using the current scene configuration
      if (userSceneConfig) {
        console.log('🔄 [ScrollScene] Reloading model with current config:', userSceneConfig.config_name);
        loadModelWithService();
      } else {
        console.warn('🔄 [ScrollScene] No user scene config available for reload');
      }
    };

    console.log('🎧 [EVENT LISTENER] Registered: bird-view-animation');
    console.log('🎧 [EVENT LISTENER] Registered: load-collaborative-model');
    console.log('🎧 [EVENT LISTENER] Registered: load-uploaded-model');
    console.log('🎧 [EVENT LISTENER] Registered: reload-current-model');
    console.log('✅ [ZUSTAND] editor-toggle, look-at-toggle, height-panel-toggle, clear-scene, rotate-model now use Zustand store');
    
    window.addEventListener('bird-view-animation', handleBirdViewAnimation as EventListener);
    window.addEventListener('load-collaborative-model', handleLoadCollaborativeModel);
    window.addEventListener('load-uploaded-model', handleLoadUploadedModel);
    window.addEventListener('reload-current-model', handleReloadCurrentModel);
    
    return () => {
      console.log('🔌 [EVENT LISTENER] Removed: 4 custom event listeners');
      window.removeEventListener('bird-view-animation', handleBirdViewAnimation as EventListener);
      window.removeEventListener('load-collaborative-model', handleLoadCollaborativeModel);
      window.removeEventListener('load-uploaded-model', handleLoadUploadedModel);
      window.removeEventListener('reload-current-model', handleReloadCurrentModel);
    };
  }, []); // Empty dependency array to run only once
  
  // ✅ ZUSTAND SUBSCRIPTIONS: Replace event listeners with Zustand store subscriptions
  // Subscribe to clearSceneRequested
  useEffect(() => {
    if (clearSceneRequested) {
      console.log('🗑️ [ZUSTAND] Clear scene requested');
      clearCurrentModel();
      clearClearSceneRequest();
    }
  }, [clearSceneRequested, clearClearSceneRequest]);
  // Subscribe to rotateModelRequested
  useEffect(() => {
    if (rotateModelRequested) {
      console.log('🔄 [ZUSTAND] Rotate model requested, angle:', rotationAngle);
      
      if (!sceneRef.current) {
        console.warn('🔄 [ZUSTAND] Scene not ready');
        clearRotateModelRequest();
        return;
      }
      
      const angle = rotationAngle;
      
      // Find the loaded model
      const model = sceneRef.current.getObjectByName('floorPlan');
      if (model) {
        const currentRotation = model.rotation.y;
        const targetRotation = currentRotation + angle;
        
        console.log('🔄 [ZUSTAND] Animating rotation from', (currentRotation * 180 / Math.PI).toFixed(2), 'to', (targetRotation * 180 / Math.PI).toFixed(2), 'degrees');
        
        // Animate rotation with GSAP
        gsap.to(model.rotation, {
          y: targetRotation,
          duration: 0.5,
          ease: 'power2.inOut',
          onUpdate: () => {
            // Force render during animation
            if (rendererRef.current && cameraRef.current && sceneRef.current) {
              rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
            if (measurementGroupRef.current) {
              measurementGroupRef.current.rotation.y = model.rotation.y;
              measurementGroupRef.current.updateMatrixWorld(true);
            }
          },
          onComplete: () => {
            console.log('🔄 [ZUSTAND] Rotation complete. New rotation Y:', model.rotation.y.toFixed(3), 'radians', '(', (model.rotation.y * 180 / Math.PI).toFixed(2), 'degrees)');
            if (measurementGroupRef.current) {
              measurementGroupRef.current.rotation.y = model.rotation.y;
              measurementGroupRef.current.updateMatrixWorld(true);
            }
            clearRotateModelRequest();
          }
        });
      } else {
        console.warn('🔄 [ZUSTAND] No model found to rotate');
        console.log('🔄 [ZUSTAND] Scene children:', sceneRef.current.children.map(c => ({ name: c.name, type: c.type })));
        clearRotateModelRequest();
      }
    }
  }, [rotateModelRequested, rotationAngle, clearRotateModelRequest])
  // Mouse event handlers for hotspot interaction
  useEffect(() => {
    if (!mountRef.current) return;

    // Throttle mouse move events to prevent flickering
    let throttleTimeout: any;

    const handleMouseMove = (event: MouseEvent) => {
      // 🛡️ PREVENT HOTSPOT INTERACTIONS WHEN GALLERY IS VISIBLE
      if (galleryVisibleRef.current || (window as any).__galleryMode) {
        // console.log('🚫 BLOCKING MOUSEMOVE - Gallery is visible or gallery mode is active');
        // console.log('  galleryVisibleRef.current:', galleryVisibleRef.current);
        // console.log('  __galleryMode:', (window as any).__galleryMode);
        // Force stop all hotspot interactions
        if (hoveredHotspot) {
          setHoveredHotspot(null);
          setHoverTooltip((prev: any) => ({ ...prev, visible: false }));
        }
        return;
      }
      
      // Ensure pulse markers stay visible during mouse movement
      if (hotspotPulseRefs.current.length > 0) {
        ensurePulseMarkersVisible();
      }
      
      // Debug: Log when hotspot detection is working
      // console.debug('MOUSEMOVE hotspot detection');
      
      if (!raycasterRef.current || !cameraRef.current || !sceneRef.current) {
        console.log('Missing refs:', { raycaster: !!raycasterRef.current, camera: !!cameraRef.current, scene: !!sceneRef.current });
        return;
      }
      
      // Calculate mouse position in normalized device coordinates (-1 to +1)
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;

      // Update the raycaster with current camera position
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

      // Get all objects that could be hotspots (cube and model hotspots)
      const hotspotObjects: THREE.Object3D[] = [];
      
      // Add cube if it exists
      if (cubeRef.current) {
        hotspotObjects.push(cubeRef.current);
      }
      
      // Add model hotspots (excluding pulse markers and edge lines)
      if (clickableObjectsRef.current.length > 0) {
        const actualHotspots = clickableObjectsRef.current.filter(obj => 
          !obj.name?.startsWith('pulse_') && 
          !obj.userData?.isEdgeLine
        );
        hotspotObjects.push(...actualHotspots);
      }
      
      // Add pulse markers for cursor detection (but not for hover effects)
      if (hotspotPulseRefs.current.length > 0) {
        const pulseMarkers = hotspotPulseRefs.current.filter((_, index) => index % 2 === 0); // Only main spheres, not glow
        hotspotObjects.push(...pulseMarkers);
      }
      
      // Check for intersections
      const intersects = raycasterRef.current.intersectObjects(hotspotObjects);
      
      // Handle marker hover visibility
      if (intersects.length > 0) {
        // Prefer the first true hotspot mesh (or its parent) rather than arbitrary first hit
        const pick = () => {
          for (const it of intersects) {
            let obj: THREE.Object3D = it.object;
            if ((obj as any)?.userData?.isEdgeLine && obj.parent) obj = obj.parent;
            if (obj.name?.includes('Hotspot') && !(obj as any).userData?.isPulseMarker) {
              return obj;
            }
          }
          // Fallback to first hit after resolving edge parent
          let fallback: THREE.Object3D = intersects[0].object;
          if ((fallback as any)?.userData?.isEdgeLine && fallback.parent) fallback = fallback.parent;
          return fallback;
        };
        let intersectedObject: THREE.Object3D = pick();
        
          // Check if hovering over a pulse marker
          if (intersectedObject.userData && intersectedObject.userData.isPulseMarker) {
            // Leaving any outlined mesh: revert edges to black
            if (lastOutlinedObjectRef.current) {
              setEdgeLineColorForMesh(lastOutlinedObjectRef.current, EDGE_COLOR_NORMAL);
              lastOutlinedObjectRef.current = null;
            }
            
            // Find the marker index more reliably
            let markerGroupIndex = -1;
            for (let i = 0; i < hotspotPulseRefs.current.length; i += 2) {
              if (hotspotPulseRefs.current[i] === intersectedObject) {
                markerGroupIndex = i / 2;
                console.log(`🎯 Found marker at group index ${markerGroupIndex} for hotspot: ${intersectedObject.userData.hotspotName}`);
                break;
              }
            }
            
            if (markerGroupIndex !== -1) {
              showMarkerOnHover(markerGroupIndex);
            }
        } else {
          // Hide all markers when hovering over other objects
          hideAllMarkers();
        }
        
        // Set cursor to pointer for hotspots and pulse markers
        if (document.body) {
          document.body.style.cursor = 'pointer';
        }
      } else {
        // Hide all markers when not hovering
        hideAllMarkers();
        // Also ensure any outlined edges are reverted to black on hover-out
        if (lastOutlinedObjectRef.current) {
          setEdgeLineColorForMesh(lastOutlinedObjectRef.current, EDGE_COLOR_NORMAL);
          lastOutlinedObjectRef.current = null;
        }
        
        // Reset cursor to default when not hovering over interactive elements
        if (document.body) {
          document.body.style.cursor = 'default';
        }
      }
      
      if (intersects.length > 0) {
        let intersectedObject: THREE.Object3D = intersects[0].object;
        if ((intersectedObject as any)?.userData?.isEdgeLine && intersectedObject.parent) {
          intersectedObject = intersectedObject.parent;
        }
        // If the intersected object has a propagated hotspotName, prefer resolving to that hotspot
        if ((intersectedObject as any)?.userData?.hotspotName) {
          const byName = clickableObjectsRef.current.find(obj => obj.name === (intersectedObject as any).userData.hotspotName);
          if (byName) intersectedObject = byName;
        }
        // console.debug('Raycast Intersection:', intersects.length);
        if (hoveredHotspot !== intersectedObject) {
          // Reset previous hotspot (excluding pulse markers)
          if (hoveredHotspot && (hoveredHotspot as THREE.Mesh).material && !hoveredHotspot.name?.startsWith('pulse_')) {
            if (hoveredHotspot === cubeRef.current) {
              ((hoveredHotspot as THREE.Mesh).material as THREE.MeshStandardMaterial).color.setHex(CUBE_NORMAL_COLOR);
            } else {
              // Reset model hotspot to theme floor color with 80% transparency
              const colors = getThreeJSThemeColors();
              ((hoveredHotspot as THREE.Mesh).material as THREE.MeshStandardMaterial).color.setHex(colors.HOTSPOT_NORMAL_COLOR);
            }
            // Reset outline to normal (black) and clear last outlined ref if matches
            setEdgeLineColorForMesh(hoveredHotspot, EDGE_COLOR_NORMAL);
            if (lastOutlinedObjectRef.current === hoveredHotspot) {
              lastOutlinedObjectRef.current = null;
            }
          }
          // Set new hotspot
          setHoveredHotspot(intersectedObject);
          
          // Show category tooltip
          // Resolve the correct hotspot name for complex multi-mesh objects
          let hotspotName = intersectedObject.name || '';
          // If this is a pulse marker, get the actual hotspot name from userData
          if (hotspotName?.startsWith('pulse_')) {
            hotspotName = (intersectedObject.userData?.hotspotName as string) || hotspotName.replace('pulse_', '');
          }
          // If still unknown or not mapped, walk up the parent chain to find a named hotspot
          if (!HOTSPOT_CATEGORIES[hotspotName]) {
            let cursor: THREE.Object3D | null = intersectedObject.parent || null;
            while (cursor) {
              const candidate = cursor.name || '';
              if (candidate && (candidate.includes('Hotspot') || HOTSPOT_CATEGORIES[candidate])) {
                hotspotName = candidate;
                break;
              }
              cursor = cursor.parent || null;
            }
          }
          // Final fallback: if userData on any level carries hotspotName
          if (!HOTSPOT_CATEGORIES[hotspotName]) {
            const tryUserDataChain = (obj: THREE.Object3D | null) => {
              let cur = obj;
              while (cur) {
                const udName = (cur.userData?.hotspotName as string) || '';
                if (udName) return udName;
                cur = cur.parent || null;
              }
              return '';
            };
            const udResolved = tryUserDataChain(intersectedObject);
            if (udResolved) hotspotName = udResolved;
          }
          // Use fallback categories if hotspotSettings is not loaded
          const fallbackCategories = {
            "Hotspot_geo_shelves": "Furniture",
            "Hotspot_geo_accent_wall": "Accent Wall",
            "Hotspot_geo_bath_countertop": "Bath Countertops",
            "Hotspot_geo_kitchen_cabinet": "Kitchen Cabinets",
            "Hotspot_geo_fireplace": "Fireplaces",
            "Hotspot_geo_floor": "Floors",
            "Hotspot_geo_kitchen_countertop": "Kitchen Countertops",
            "Hotspot_geo_coffee_table": "Furniture",
            "Hotspot_geo_island": "Kitchen Islands",
            "Hotspot_balcony_wall": "Balcony Wall",
            "Hotspot_geo_backsplash": "Kitchen Backsplashes",
            "Hotspot_geo_bathroom_walls": "Bathroom Walls",
            "Hotspot_geo_bathroom_wall_1": "Bathroom Wall 1",
            "Hotspot_geo_bathroom_wall_2": "Bathroom Wall 2",
            "Hotspot_geo_bathroom_wall_3": "Bathroom Wall 3",
            "Hotspot_geo_bathroom_wall_4": "Bathroom Wall 4",
            "Hotspot_tv_wall": "TV Accent Wall"
          };
          
          const allCategories = { ...fallbackCategories, ...HOTSPOT_CATEGORIES };
          const category = allCategories[hotspotName] || 'General';
          
          setHoverTooltip({
            visible: true,
            text: category,
            position: { x: event.clientX, y: event.clientY }
          });
          
          if ((intersectedObject as THREE.Mesh).material && 
              !intersectedObject.name?.startsWith('pulse_') && 
              !intersectedObject.userData?.isEdgeLine) {
            if (intersectedObject === cubeRef.current) {
              // Highlight cube in red
              ((intersectedObject as THREE.Mesh).material as THREE.MeshStandardMaterial).color.setHex(CUBE_HIGHLIGHT_COLOR);
              console.log('Changed cube color to red!');
            } else {
              // Highlight model hotspot with consistent bright purple color
              ((intersectedObject as THREE.Mesh).material as THREE.MeshStandardMaterial).color.setHex(HOTSPOT_COMPLEMENTARY_HOVER_COLOR);
            }
            // Reset previous outlined object to black, then set current to white
            if (lastOutlinedObjectRef.current && lastOutlinedObjectRef.current !== intersectedObject) {
              setEdgeLineColorForMesh(lastOutlinedObjectRef.current, EDGE_COLOR_NORMAL);
            }
            setEdgeLineColorForMesh(intersectedObject, EDGE_COLOR_HOVER);
            lastOutlinedObjectRef.current = intersectedObject;
          }
        }
      } else {
        // No intersection, reset hover state (excluding pulse markers)
        if (hoveredHotspot && (hoveredHotspot as THREE.Mesh).material && !hoveredHotspot.name?.startsWith('pulse_')) {
          if (hoveredHotspot === cubeRef.current) {
            // Reset cube to normal green
            ((hoveredHotspot as THREE.Mesh).material as THREE.MeshStandardMaterial).color.setHex(CUBE_NORMAL_COLOR);
          } else {
            // Reset model hotspot to theme floor color with 80% transparency
            const colors = getThreeJSThemeColors();
            ((hoveredHotspot as THREE.Mesh).material as THREE.MeshStandardMaterial).color.setHex(colors.HOTSPOT_NORMAL_COLOR);
          }
        }
        setHoveredHotspot(null);
        
        // Hide tooltip when no intersection
        setHoverTooltip((prev: any) => ({ ...prev, visible: false }));
      }
      
      // Always ensure pulse markers are visible after any mouse movement
      if (hotspotPulseRefs.current.length > 0) {
        ensurePulseMarkersVisible();
        // Debug: Log pulse marker status on mouse move (commented out to reduce spam)
        // debugPulseMarkers();
      }
    };

    const handleClick = (event: MouseEvent) => {
      // 🛡️ PREVENT EVENT BUBBLING FOR GALLERY INTERACTIONS
      if (galleryVisibleRef.current || (window as any).__galleryMode) {
        // console.log('🚫 BLOCKING CLICK - Gallery is visible or gallery mode is active');
        // console.log('  galleryVisibleRef.current:', galleryVisibleRef.current);
        // console.log('  __galleryMode:', (window as any).__galleryMode);
        event.preventDefault();
        event.stopPropagation();
        // Force stop any ongoing hotspot interactions
        if (hoveredHotspot) {
          setHoveredHotspot(null);
          setHoverTooltip((prev: any) => ({ ...prev, visible: false }));
        }
        return;
      }
      
      // 🛡️ PREVENT EVENT BUBBLING FOR EDITOR INTERACTIONS
      const isEditorEnabled = (window as any).__isEditorEnabled === true;
      const birdViewLocked = (window as any).__birdViewLocked === true;
      const suppressCameraResume = (window as any).__suppressCameraResume === true;
      
      if (isEditorEnabled || birdViewLocked || suppressCameraResume) {
        console.log('🚫 BLOCKING CLICK - Editor interactions active:', {
          isEditorEnabled,
          birdViewLocked,
          suppressCameraResume
        });
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      
      if (!raycasterRef.current || !cameraRef.current || !sceneRef.current) return;
      
      // Calculate mouse position
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;

      // Update the raycaster with current camera position
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

      // Check for intersections
      const hotspotObjects: THREE.Object3D[] = [];
      
      // Add cube if it exists
      if (cubeRef.current) hotspotObjects.push(cubeRef.current);
      
      // Add model hotspots
      if (clickableObjectsRef.current.length > 0) {
        hotspotObjects.push(...clickableObjectsRef.current);
      }
      
      // Add pulse markers for click detection
      if (hotspotPulseRefs.current.length > 0) {
        const pulseMarkers = hotspotPulseRefs.current.filter((_, index) => index % 2 === 0); // Only main spheres, not glow
        hotspotObjects.push(...pulseMarkers);
      }
      
      const intersects = raycasterRef.current.intersectObjects(hotspotObjects);
      
      // Update cursor based on intersection for click detection
      if (intersects.length > 0) {
        let intersectedObject: THREE.Object3D = intersects[0].object;
        if ((intersectedObject as any)?.userData?.isEdgeLine && intersectedObject.parent) {
          intersectedObject = intersectedObject.parent;
        }
        // Set cursor to pointer for hotspots and pulse markers
        if (document.body) {
          document.body.style.cursor = 'pointer';
        }
      } else {
        // Reset cursor to default when not hovering over interactive elements
        if (document.body) {
          document.body.style.cursor = 'default';
        }
      }
      
      if (intersects.length > 0) {
        let clickedObject: THREE.Object3D = intersects[0].object;
        const intersection = intersects[0];
        
        // Apply the same resolution logic as mousemove handler
        if ((clickedObject as any)?.userData?.isEdgeLine && clickedObject.parent) {
          console.log(`🔗 Resolving edge line "${clickedObject.name}" to parent "${clickedObject.parent.name}"`);
          clickedObject = clickedObject.parent;
        }
        // If the intersected object has a propagated hotspotName, prefer resolving to that hotspot
        if ((clickedObject as any)?.userData?.hotspotName) {
          const byName = clickableObjectsRef.current.find(obj => obj.name === (clickedObject as any).userData.hotspotName);
          if (byName) {
            console.log(`🔗 Resolving child mesh "${clickedObject.name}" to hotspot "${byName.name}"`);
            clickedObject = byName;
          }
        }
        
        console.log("🎯 CLICKED OBJECT:", clickedObject.name);
        // console.log("  Object type:", clickedObject.type);
        // console.log("  Local position:", clickedObject.position);
        // console.log("  World position:", clickedObject.getWorldPosition(new THREE.Vector3()));
        // console.log("  Camera position:", cameraRef.current?.position);
        // console.log("  Intersection point:", intersection.point);
        
        // Check if this is a pulse marker and get the actual hotspot
        let actualHotspot = clickedObject;
        if (clickedObject.name?.startsWith('pulse_')) {
          const hotspotName = clickedObject.userData.hotspotName;
          actualHotspot = clickableObjectsRef.current.find(obj => obj.name === hotspotName) || clickedObject;
          console.log('🎯 Pulse marker clicked, actual hotspot:', actualHotspot.name);
        }
        
        console.log('🎯 CLICK DEBUG - Hotspot details:', {
          clickedObjectName: clickedObject.name,
          actualHotspotName: actualHotspot.name,
          actualHotspotType: actualHotspot.type,
          actualHotspotUserData: actualHotspot.userData
        });
        
        // Store the clicked hotspot for debug display
        setClickedHotspot(actualHotspot);
        
        // Log the current camera state before moving
        // console.log('🎯 BEFORE MOVING CAMERA:');
        // console.log('  Current camera position:', cameraRef.current?.position);
        // console.log('  Current camera rotation:', cameraRef.current?.rotation);
        // console.log('  Actual hotspot:', actualHotspot.name);
        
        // Move camera to the actual hotspot (gallery will auto-trigger on animation completion)
        moveCameraToHotspot(actualHotspot);
        
        // Animation is now handled by GSAP bezier curve
        // No need to override camera position during animation
      }
    };

    // Add event listeners with optimized throttled mouse move
    const throttledMouseMove = (event: MouseEvent) => {
      if (throttleTimeout) return;
      throttleTimeout = setTimeout(() => {
        handleMouseMove(event);
        throttleTimeout = null as any;
      }, 8); // Reduced from 16ms to 8ms for smoother 120fps
    };
    
    // Store references to original listeners for gallery mode management
    (window as any).__originalMouseMoveListener = throttledMouseMove;
    (window as any).__originalClickListener = handleClick;
    
    console.log('🎧 [EVENT LISTENER] Registered: mousemove (throttledMouseMove for raycasting)');
    console.log('🎧 [EVENT LISTENER] Registered: click (handleClick for hotspots)');
    window.addEventListener('mousemove', throttledMouseMove);
    window.addEventListener('click', handleClick);

    // Listen for gallery-closed event to re-enable listeners
    const handleGalleryClosed = () => {
      console.log('🎯 [GALLERY CLOSED] Re-registering hotspot event listeners');
      // Remove existing listeners
      window.removeEventListener('mousemove', throttledMouseMove);
      window.removeEventListener('click', handleClick);
      // Re-register immediately
      window.addEventListener('mousemove', throttledMouseMove);
      window.addEventListener('click', handleClick);
      console.log('  ✅ Hotspot listeners re-registered');
    };
    
    window.addEventListener('gallery-closed', handleGalleryClosed);

    // Cleanup
    return () => {
      console.log('🔌 [EVENT LISTENER] Removed: mousemove/click (raycasting + hotspots)');
      window.removeEventListener('mousemove', throttledMouseMove);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('gallery-closed', handleGalleryClosed);
      // Clean up stored references
      delete (window as any).__originalMouseMoveListener;
      delete (window as any).__originalClickListener;
      // Clean up pulse animation only (don't remove markers)
      stopPulseAnimation();
    };
  }, [hoveredHotspot]);
  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          pointerEvents: "none",
          zIndex: 1
        }}
      >
        <div
          ref={mountRef}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
      
      {/* Debug Display - Only visible when showDebug is true AND focused on hotspot */}
      {showDebug && (
      <div style={{
        position: "fixed",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        padding: "8px 12px",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        color: "white",
        fontSize: "12px",
        zIndex: 1000,
        pointerEvents: "auto",
        fontFamily: "monospace",
        textAlign: "center"
      }}>
        <div>Focused: {isFocusedOnHotspot ? 'YES' : 'NO'}</div>
        {isFocusedOnHotspot && (
          <>
            <div>Camera Position: {cameraRef.current ? `${cameraRef.current.position.x.toFixed(2)}, ${cameraRef.current.position.y.toFixed(2)}, ${cameraRef.current.position.z.toFixed(2)}` : 'N/A'}</div>
            <div>Looking At: {hoveredHotspot ? (() => {
              const target = new THREE.Vector3();
              hoveredHotspot.getWorldPosition(target);
              return `${target.x.toFixed(2)}, ${target.y.toFixed(2)}, ${target.z.toFixed(2)}`;
            })() : 'N/A'}</div>
            <div>Clicked Hotspot: {clickedHotspot ? `${clickedHotspot.name} (${clickedHotspot.position.x.toFixed(2)}, ${clickedHotspot.position.y.toFixed(2)}, ${clickedHotspot.position.z.toFixed(2)})` : 'N/A'}</div>
            <div>Hovering Over: {hoveredHotspot ? `${hoveredHotspot.name} (${hoveredHotspot.position.x.toFixed(2)}, ${hoveredHotspot.position.y.toFixed(2)}, ${hoveredHotspot.position.z.toFixed(2)})` : 'N/A'}</div>
            <div>Hover World Pos: {hoveredHotspot ? (() => {
              const target = new THREE.Vector3();
              hoveredHotspot.getWorldPosition(target);
              return `${target.x.toFixed(2)}, ${target.y.toFixed(2)}, ${target.z.toFixed(2)}`;
            })() : 'N/A'}</div>
            <div>Hover Local Pos: {hoveredHotspot ? `${hoveredHotspot.position.x.toFixed(2)}, ${hoveredHotspot.position.y.toFixed(2)}, ${hoveredHotspot.position.z.toFixed(2)}` : 'N/A'}</div>
          </>
        )}
      </div>
      )}


      {/* Blue Position Panel - Draggable Container */}
      {showPosition && (
        <div 
          className="fixed z-[55] bg-blue-900/95 text-white rounded-lg text-xs font-mono"
          style={{ 
            border: '2px solid #3b82f6',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            backdropFilter: 'blur(10px)',
            width: '350px',
            top: '10vh',
            left: '20px',
            cursor: 'move',
            userSelect: 'none',
            overflow: 'auto'
          }}
          onMouseDown={(e) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('position-header') || target === e.currentTarget) {
              e.preventDefault();
              e.stopPropagation();
              
              const element = e.currentTarget as HTMLElement;
              const rect = element.getBoundingClientRect();
              const startX = e.clientX - rect.left;
              const startY = e.clientY - rect.top;
              
              const onMouseMove = (e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                
                const newLeft = Math.max(0, Math.min(window.innerWidth - rect.width, e.clientX - startX));
                const newTop = Math.max(0, Math.min(window.innerHeight - rect.height, e.clientY - startY));
                
                element.style.left = newLeft + 'px';
                element.style.top = newTop + 'px';
              };
              
              const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
              };
              
              document.addEventListener('mousemove', onMouseMove);
              document.addEventListener('mouseup', onMouseUp);
            }
          }}
          onTouchStart={(e) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('position-header') || target === e.currentTarget) {
              e.preventDefault();
              e.stopPropagation();
              
              const element = e.currentTarget as HTMLElement;
              const rect = element.getBoundingClientRect();
              const touch = e.touches[0];
              const startX = touch.clientX - rect.left;
              const startY = touch.clientY - rect.top;
              
              const onTouchMove = (e: TouchEvent) => {
                e.preventDefault();
                e.stopPropagation();
                
                const touch = e.touches[0];
                const newLeft = Math.max(0, Math.min(window.innerWidth - rect.width, touch.clientX - startX));
                const newTop = Math.max(0, Math.min(window.innerHeight - rect.height, touch.clientY - startY));
                
                element.style.left = newLeft + 'px';
                element.style.top = newTop + 'px';
              };
              
              const onTouchEnd = () => {
                document.removeEventListener('touchmove', onTouchMove);
                document.removeEventListener('touchend', onTouchEnd);
              };
              
              document.addEventListener('touchmove', onTouchMove);
              document.addEventListener('touchend', onTouchEnd);
            }
          }}
        >
          {/* Header */}
          <div className="position-header p-3 border-b border-blue-600 bg-blue-800/50 rounded-t-lg">
            <div className="font-bold text-sm text-blue-200 flex items-center justify-between">
              <span className="flex items-center">
                <span className="mr-2">🎯</span>
                Position Panel
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-3">
            <div className="mb-2">
              <span className="text-green-400">Start Position (Current Camera):</span> {(() => {
                const start = cameraRef.current?.position || new THREE.Vector3();
                return `${start.x.toFixed(2)}, ${start.y.toFixed(2)}, ${start.z.toFixed(2)}`;
              })()}
            </div>
            <div className="mb-2">
              <span className="text-red-400">Last Hotspot Position:</span> {(() => {
                const lastHotspot = cameraStateRef.current.lastHotspotPosition;
                return lastHotspot ? `${lastHotspot.x.toFixed(2)}, ${lastHotspot.y.toFixed(2)}, ${lastHotspot.z.toFixed(2)}` : 'N/A';
              })()}
            </div>
            <div className="mb-2">
              <span className="text-yellow-400">Saved Spline Progress:</span> {(() => {
                const progress = cameraStateRef.current.savedSplineProgress;
                return progress !== undefined ? `${(progress * 100).toFixed(3)}%` : 'N/A';
              })()}
            </div>
            <div className="mb-2">
              <span className="text-blue-400">Exact Spline Position:</span> {(() => {
                const exact = cameraStateRef.current.exactSplinePosition;
                return exact ? `${exact.x.toFixed(2)}, ${exact.y.toFixed(2)}, ${exact.z.toFixed(2)}` : 'N/A';
              })()}
            </div>
            <div className="mb-2">
              <span className="text-indigo-400">Saved LookAt Target:</span> {(() => {
                const lookAt = cameraStateRef.current.savedLookAtTarget;
                if (!lookAt) return 'N/A';
                
                const cameraPos = cameraRef.current?.position;
                if (cameraPos) {
                  const distance = lookAt.distanceTo(cameraPos);
                  return `${lookAt.x.toFixed(2)}, ${lookAt.y.toFixed(2)}, ${lookAt.z.toFixed(2)} (${distance.toFixed(2)}m away)`;
                }
                return `${lookAt.x.toFixed(2)}, ${lookAt.y.toFixed(2)}, ${lookAt.z.toFixed(2)}`;
              })()}
            </div>
            <div className="mb-2">
              <span className="text-teal-300">Current LookAt Target:</span> {(() => {
                const lookAt = currentLookAtTarget;
                if (!lookAt) return 'N/A';
                const cameraPos = cameraRef.current?.position;
                if (cameraPos) {
                  const distance = lookAt.distanceTo(cameraPos);
                  return `${lookAt.x.toFixed(2)}, ${lookAt.y.toFixed(2)}, ${lookAt.z.toFixed(2)} (${distance.toFixed(2)}m away)`;
                }
                return `${lookAt.x.toFixed(2)}, ${lookAt.y.toFixed(2)}, ${lookAt.z.toFixed(2)}`;
              })()}
            </div>
            <div className="mb-2">
              <span className="text-purple-400">Journey Start (Main Path):</span> {(() => {
                const journey = cameraStateRef.current.journeyStartPosition;
                return `${journey.x.toFixed(2)}, ${journey.y.toFixed(2)}, ${journey.z.toFixed(2)}`;
              })()}
            </div>
            <div className="mb-2">
              <span className="text-cyan-400">State:</span> {cameraStateRef.current.isOnMainPath ? '🛣️ Main Path' : '🎯 Branch Path'}
            </div>
            <div className="mb-2">
              <span className="text-orange-400">Animation Status:</span> {isAnimatingRef.current ? '🎬 Animating' : '⏸️ Idle'}
            </div>
            <div className="mb-2">
              <span className="text-cyan-400">Camera Path Points:</span> {cameraPathData?.cameraPoints?.length || 0}
            </div>
            <div className="mb-2">
              <span className="text-green-400">Current Path Progress:</span> {(() => {
                const progress = pathProgressRef.current.t;
                return `${(progress * 100).toFixed(1)}%`;
              })()}
            </div>
            <div className="mb-2">
              <span className="text-purple-400">Current Point Index:</span> {(() => {
                const progress = pathProgressRef.current.t;
                const pointIndex = Math.floor(progress * ((cameraPathData?.cameraPoints?.length || 1) - 1));
                return pointIndex;
              })()}
            </div>
            <div className="mb-2">
              <span className="text-yellow-400">Current Point Coords:</span> {(() => {
                const progress = pathProgressRef.current.t;
                const pointIndex = Math.floor(progress * ((cameraPathData?.cameraPoints?.length || 1) - 1));
                const point = cameraPathData?.cameraPoints?.[pointIndex];
                return point ? `${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)}` : 'N/A';
              })()}
            </div>
            <div className="mb-2">
              <span className="text-teal-400">Current LookAt Target:</span> {(() => {
                const progress = pathProgressRef.current.t;
                const pointIndex = Math.floor(progress * ((cameraPathData?.lookAtTargets?.length || 1) - 1));
                const target = cameraPathData?.lookAtTargets?.[pointIndex];
                return target ? `${target.x.toFixed(2)}, ${target.y.toFixed(2)}, ${target.z.toFixed(2)}` : 'N/A';
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Debug Toggle Checkbox */}
      {SHOW_DEBUG && (
        <div 
          className="fixed top-4 right-4 z-[70] bg-black/80 text-white p-2 rounded-lg text-xs font-mono"
          style={{ 
            border: '1px solid #666',
            backdropFilter: 'blur(10px)'
          }}
        >
          <div className="space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showDebug}
                onChange={(e) => setShowDebug(e.target.checked)}
                className="w-3 h-3 text-red-400 bg-gray-700 border-gray-600 rounded focus:ring-red-500 focus:ring-2"
              />
              <span className="text-red-400">🐭 Debug Panel</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showPosition}
                onChange={(e) => setShowPosition(e.target.checked)}
                className="w-3 h-3 text-blue-400 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-blue-400">🎯 Position Panel</span>
            </label>
          </div>
        </div>
      )}

      {/* Consolidated Debug Panel */}
      {showDebug && (
        <div 
          className="fixed z-[60] bg-black/95 text-white rounded-lg text-xs font-mono"
          style={{ 
            border: '2px solid #ff6b6b',
            boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)',
            backdropFilter: 'blur(10px)',
            width: '400px',
            height: '60vh',
            maxHeight: '80vh',
            top: '20vh',
            left: 'calc(100vw - 420px)',
            cursor: 'move',
            userSelect: 'none',
            overflow: 'auto'
          }}
          onMouseDown={(e) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('debug-header') || target === e.currentTarget) {
              e.preventDefault();
              e.stopPropagation();
              
              const element = e.currentTarget as HTMLElement;
              const rect = element.getBoundingClientRect();
              const startX = e.clientX - rect.left;
              const startY = e.clientY - rect.top;
              
              const onMouseMove = (e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                
                const newLeft = Math.max(0, Math.min(window.innerWidth - rect.width, e.clientX - startX));
                const newTop = Math.max(0, Math.min(window.innerHeight - rect.height, e.clientY - startY));
                
                element.style.left = newLeft + 'px';
                element.style.top = newTop + 'px';
              };
              
              const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
              };
              
              document.addEventListener('mousemove', onMouseMove);
              document.addEventListener('mouseup', onMouseUp);
            }
          }}
          onTouchStart={(e) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('debug-header') || target === e.currentTarget) {
              e.preventDefault();
              e.stopPropagation();
              
              const element = e.currentTarget as HTMLElement;
              const rect = element.getBoundingClientRect();
              const touch = e.touches[0];
              const startX = touch.clientX - rect.left;
              const startY = touch.clientY - rect.top;
              
              const onTouchMove = (e: TouchEvent) => {
                e.preventDefault();
                e.stopPropagation();
                
                const touch = e.touches[0];
                const newLeft = Math.max(0, Math.min(window.innerWidth - rect.width, touch.clientX - startX));
                const newTop = Math.max(0, Math.min(window.innerHeight - rect.height, touch.clientY - startY));
                
                element.style.left = newLeft + 'px';
                element.style.top = newTop + 'px';
              };
              
              const onTouchEnd = () => {
                document.removeEventListener('touchmove', onTouchMove);
                document.removeEventListener('touchend', onTouchEnd);
              };
              
              document.addEventListener('touchmove', onTouchMove);
              document.addEventListener('touchend', onTouchEnd);
            }
          }}
        >
          {/* Header */}
          <div className="debug-header p-3 border-b border-gray-600 bg-gray-800/50 rounded-t-lg">
            <div className="font-bold text-sm text-red-400 flex items-center justify-between">
              <span className="flex items-center">
                <span className="mr-2">🐭</span>
                Debug Panel
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    console.log('🚨 NUCLEAR RESET triggered!');
                    // Force restore all scrolling with CSS reset
                    if (typeof document !== 'undefined') {
                      // Force enable scrolling
                      document.body.style.overflow = 'auto';
                      document.body.style.touchAction = 'auto';
                      document.documentElement.style.overflow = 'auto';
                      document.documentElement.style.touchAction = 'auto';
                      
                      // Clear any stored values
                      delete (window as any).__galleryMode;
                      delete (window as any).__originalBodyOverflow;
                      delete (window as any).__originalBodyTouchAction;
                      delete (window as any).__originalHtmlOverflow;
                      delete (window as any).__originalHtmlTouchAction;
                      
                      console.log('✅ Forced CSS scroll restoration');
                    }
                    console.log('🚨 Nuclear reset completed');
                  }}
                  className="text-yellow-400 hover:text-yellow-300 text-xs px-2 py-1 border border-yellow-400 rounded"
                  title="Force restore scrolling (nuclear option)"
                >
                  🚨 RESET
                </button>
                <button
                  onClick={() => {
                    console.log('🧪 Testing scroll restoration...');
                    
                    // Test 1: Programmatic scrolling (this always works)
                    const currentScroll = window.scrollY;
                    window.scrollTo(0, currentScroll + 100);
                    
                    // Test 2: Check if event listeners are blocking
                    const testEvent = new WheelEvent('wheel', { deltaY: 100 });
                    let wasBlocked = false;
                    
                    const testListener = (e: Event) => {
                      if (e.defaultPrevented) {
                        wasBlocked = true;
                        console.log('❌ Event is being blocked by another listener');
                      }
                    };
                    
                    window.addEventListener('wheel', testListener, { once: true });
                    window.dispatchEvent(testEvent);
                    
                    setTimeout(() => {
                      if (wasBlocked) {
                        console.log('❌ Scroll test FAILED - events are being blocked');
                        alert('❌ Scroll test FAILED - events are being blocked\n\nCheck console for details');
                      } else {
                        console.log('✅ Scroll test PASSED - no event blocking detected');
                        alert('✅ Scroll test PASSED - no event blocking detected\n\nTry scrolling with mouse wheel or touch');
                      }
                      window.removeEventListener('wheel', testListener);
                    }, 50);
                  }}
                  className="text-green-400 hover:text-green-300 text-xs px-2 py-1 border border-green-400 rounded"
                  title="Test if scrolling is working"
                >
                  🧪 TEST
                </button>
                <button
                  onClick={() => setShowDebug(false)}
                  className="text-gray-400 hover:text-white text-lg"
                >
                  ×
                </button>
      </div>
    </div>
          </div>

          {/* Scrollable Content */}
          <div className="p-3 overflow-y-auto bg-black/80" style={{ height: 'calc(60vh - 60px)' }}>
            
            {/* Gallery Status */}
            <div className="mb-3 p-2 bg-gray-800/50 rounded border border-gray-600">
              <div className="font-semibold text-yellow-400 mb-1">Gallery Status:</div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div>Visible: <span className={galleryVisible ? 'text-green-400' : 'text-red-400'}>{galleryVisible ? '✅ YES' : '❌ NO'}</span></div>
                <div>Loading: <span className={galleryLoading ? 'text-yellow-400' : 'text-green-400'}>{galleryLoading ? '⏳ YES' : '✅ NO'}</span></div>
                <div>Images: <span className="text-blue-400">{galleryImages.length}</span></div>
                <div>Hotspot: <span className="text-purple-400 text-xs">{currentHotspot || 'None'}</span></div>
      </div>
    </div>

            {/* Event Blocking Status */}
            <div className="mb-3 p-2 bg-gray-800/50 rounded border border-gray-600">
              <div className="font-semibold text-yellow-400 mb-1">Event Blocking:</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Gallery Mode:</span>
                  <span className={(window as any).__galleryMode ? 'text-red-400' : 'text-green-400'}>
                    {(window as any).__galleryMode ? '🚫 BLOCKED' : '✅ ALLOWED'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>CSS Blocking:</span>
                  <span className={
                    document.body.style.overflow === 'hidden' || 
                    document.body.style.touchAction === 'none' ? 'text-red-400' : 'text-green-400'
                  }>
                    {document.body.style.overflow === 'hidden' || 
                     document.body.style.touchAction === 'none' ? '🚫 ACTIVE' : '✅ NONE'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Body Overflow:</span>
                  <span className="text-blue-400">{document.body.style.overflow || 'auto'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Body Touch-Action:</span>
                  <span className="text-blue-400">{document.body.style.touchAction || 'auto'}</span>
                </div>
              </div>
            </div>

            {/* Scroll Status */}
            <div className="mb-3 p-2 bg-gray-800/50 rounded border border-gray-600">
              <div className="font-semibold text-yellow-400 mb-1">Scroll Status:</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Scroll Y:</span>
                  <span className="text-blue-400">{typeof window !== 'undefined' ? Math.round(window.scrollY) : 'N/A'}px</span>
                </div>
                <div className="flex justify-between">
                  <span>Scroll Height:</span>
                  <span className="text-blue-400">{typeof document !== 'undefined' ? Math.round(document.documentElement.scrollHeight) : 'N/A'}px</span>
                </div>
                <div className="flex justify-between">
                  <span>Body Overflow:</span>
                  <span className="text-blue-400">{typeof document !== 'undefined' ? document.body.style.overflow || 'auto' : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>HTML Overflow:</span>
                  <span className="text-blue-400">{typeof document !== 'undefined' ? document.documentElement.style.overflow || 'auto' : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Touch Action:</span>
                  <span className="text-blue-400">{typeof document !== 'undefined' ? document.body.style.touchAction || 'auto' : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Gallery Mode:</span>
                  <span className="text-red-400">{(window as any).__galleryMode ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>

            {/* Mobile Debug */}
            <div className="mb-3 p-2 bg-gray-800/50 rounded border border-gray-600">
              <div className="font-semibold text-yellow-400 mb-1">Mobile Debug:</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Device Type:</span>
                  <span className="text-blue-400">
                    {typeof window !== 'undefined' && 'ontouchstart' in window ? '📱 Mobile' : '🖥️ Desktop'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Touch Support:</span>
                  <span className="text-blue-400">{typeof window !== 'undefined' && 'ontouchstart' in window ? '✅ YES' : '❌ NO'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Touch Points:</span>
                  <span className="text-blue-400">{typeof navigator !== 'undefined' ? navigator.maxTouchPoints : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Touch Action:</span>
                  <span className="text-blue-400">{typeof document !== 'undefined' ? document.body.style.touchAction || 'auto' : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Body Overflow:</span>
                  <span className="text-blue-400">{typeof document !== 'undefined' ? document.body.style.overflow || 'auto' : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pointer Events:</span>
                  <span className="text-blue-400">{typeof document !== 'undefined' ? document.body.style.pointerEvents || 'auto' : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Screen Size:</span>
                  <span className="text-blue-400">
                    {typeof window !== 'undefined' ? `${window.screen.width}×${window.screen.height}` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Viewport Size:</span>
                  <span className="text-blue-400">
                    {typeof window !== 'undefined' ? `${window.innerWidth}×${window.innerHeight}` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Pixel Ratio:</span>
                  <span className="text-blue-400">
                    {typeof window !== 'undefined' ? window.devicePixelRatio.toFixed(2) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>User Agent:</span>
                  <span className="text-blue-400 text-xs">{typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 25) + '...' : 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Scroll Blocking Debug */}
            <div className="mb-3 p-2 bg-gray-800/50 rounded border border-gray-600">
              <div className="font-semibold text-yellow-400 mb-1">Scroll Blocking Debug:</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Body Overflow:</span>
                  <span className="text-blue-400">{typeof document !== 'undefined' ? document.body.style.overflow || 'auto' : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>HTML Overflow:</span>
                  <span className="text-blue-400">{typeof document !== 'undefined' ? document.documentElement.style.overflow || 'auto' : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Body Position:</span>
                  <span className="text-blue-400">{typeof document !== 'undefined' ? document.body.style.position || 'static' : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Body Height:</span>
                  <span className="text-blue-400">{typeof document !== 'undefined' ? document.body.style.height || 'auto' : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Body Top:</span>
                  <span className="text-blue-400">{typeof document !== 'undefined' ? document.body.style.top || '0px' : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Body Left:</span>
                  <span className="text-blue-400">{typeof document !== 'undefined' ? document.body.style.left || '0px' : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Body Transform:</span>
                  <span className="text-blue-400">{typeof document !== 'undefined' ? document.body.style.transform || 'none' : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Body Touch Action:</span>
                  <span className="text-blue-400">{typeof document !== 'undefined' ? document.body.style.touchAction || 'auto' : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>HTML Touch Action:</span>
                  <span className="text-blue-400">{typeof document !== 'undefined' ? document.documentElement.style.touchAction || 'auto' : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Body User Select:</span>
                  <span className="text-blue-400">{typeof document !== 'undefined' ? document.body.style.userSelect || 'auto' : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Body Pointer Events:</span>
                  <span className="text-blue-400">{typeof document !== 'undefined' ? document.body.style.pointerEvents || 'auto' : 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Event Listener Debug */}
            <div className="mb-3 p-2 bg-gray-800/50 rounded border border-gray-600">
              <div className="font-semibold text-yellow-400 mb-1">Event Listener Debug:</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Wheel Events:</span>
                  <span className="text-blue-400">
                    {typeof (window as any).__wheelListener !== 'undefined' ? 
                      ((window as any).__wheelListener ? '🚫 BLOCKED' : '✅ ALLOWED') : '❓ UNKNOWN'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Touch Move Events:</span>
                  <span className="text-blue-400">
                    {typeof (window as any).__touchmoveListener !== 'undefined' ? 
                      ((window as any).__touchmoveListener ? '🚫 BLOCKED' : '✅ ALLOWED') : '❓ UNKNOWN'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Touch Start Events:</span>
                  <span className="text-blue-400">
                    {typeof (window as any).__touchstartListener !== 'undefined' ? 
                      ((window as any).__touchstartListener ? '🚫 BLOCKED' : '✅ ALLOWED') : '❓ UNKNOWN'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Key Events:</span>
                  <span className="text-blue-400">
                    {typeof (window as any).__keydownListener !== 'undefined' ? 
                      ((window as any).__keydownListener ? '🚫 BLOCKED' : '✅ ALLOWED') : '❓ UNKNOWN'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Gallery Mode:</span>
                  <span className="text-blue-400">
                    {typeof (window as any).__galleryMode !== 'undefined' ? 
                      ((window as any).__galleryMode ? '🚫 ACTIVE' : '✅ INACTIVE') : '❓ UNKNOWN'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Scene Events:</span>
                  <span className="text-blue-400">
                    {typeof (window as any).__sceneEventsDisabled !== 'undefined' ? 
                      ((window as any).__sceneEventsDisabled ? '🚫 DISABLED' : '✅ ENABLED') : '❓ UNKNOWN'
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Debug Spheres Legend */}
            <div className="mb-3 p-2 bg-gray-800/50 rounded border border-gray-600">
              <div className="font-semibold text-yellow-400 mb-1 flex justify-between items-center">
                <span>Debug Spheres:</span>
                <span className="text-blue-400 text-xs">
                  {sceneRef.current ? 
                    Array.from(sceneRef.current.children).filter((child: THREE.Object3D) => 
                      child.name === 'debug_hotspot_marker' || 
                      child.name === 'debug_camera_marker' || 
                      child.name === 'debug_return_from_marker' || 
                      child.name === 'debug_return_to_marker' ||
                      child.name === 'debug_intro_start_marker' || 
                      child.name === 'debug_intro_end_marker'
                    ).length : 0} active
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <span>Red: Clicked Hotspot</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span>Blue: Camera Target</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span>Green: Return From</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                  <span>Orange: Return To</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                  <span>Purple: Intro Start</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-cyan-500 rounded-full mr-2"></div>
                  <span>Cyan: Intro End</span>
                </div>
              </div>
            </div>

            {/* Recent Events */}
            <div className="mb-3 p-2 bg-gray-800/50 rounded border border-gray-600">
              <div className="font-semibold text-yellow-400 mb-1">Recent Events:</div>
              <div className="text-xs text-gray-300">
                {typeof (window as any).__lastEventTime !== 'undefined' ? 
                  <div>
                    <div>Last: {(window as any).__lastEventType || 'None'}</div>
                    <div>{Math.round((Date.now() - (window as any).__lastEventTime) / 1000)}s ago</div>
                  </div> : 
                  'No events tracked'
                }
              </div>
            </div>

            {/* Touch Event Counter */}
            <div className="mb-3 p-2 bg-gray-800/50 rounded border border-gray-600">
              <div className="font-semibold text-yellow-400 mb-1">Touch Event Counter:</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Touch Start:</span>
                  <span className="text-blue-400">{eventCounts.touchstart}</span>
                </div>
                <div className="flex justify-between">
                  <span>Touch Move:</span>
                  <span className="text-blue-400">{eventCounts.touchmove}</span>
                </div>
                <div className="flex justify-between">
                  <span>Touch End:</span>
                  <span className="text-blue-400">{eventCounts.touchend}</span>
                </div>
                <div className="flex justify-between">
                  <span>Wheel Events:</span>
                  <span className="text-blue-400">{eventCounts.wheel}</span>
                </div>
                <div className="flex justify-between">
                  <span>Click Events:</span>
                  <span className="text-blue-400">{eventCounts.click}</span>
                </div>
                <div className="flex justify-between">
                  <span>Key Events:</span>
                  <span className="text-blue-400">{eventCounts.keydown}</span>
                </div>
              </div>
            </div>

            {/* Camera Info */}
            {debugInfo && (
              <div className="mb-3 p-2 bg-gray-800/50 rounded border border-gray-600">
                <div className="font-semibold text-yellow-400 mb-1">Camera Info:</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Position:</span>
                    <span className="text-blue-400">
                      {debugInfo.cameraPos ? 
                        `${debugInfo.cameraPos[0].toFixed(1)}, ${debugInfo.cameraPos[1].toFixed(1)}, ${debugInfo.cameraPos[2].toFixed(1)}` : 
                        'N/A'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Window Size:</span>
                    <span className="text-blue-400">{debugInfo.windowWidth}×{debugInfo.windowHeight}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Current Section:</span>
                    <span className="text-blue-400">{debugInfo.currentSection}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Manual Edit Mode:</span>
                    <span className={`text-2xl ${isManualEditMode ? 'text-green-400' : 'text-gray-400'}`}>
                      {isManualEditMode ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Scene Stage:</span>
                    <span className="text-blue-400">{sceneStage}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Scroll Info */}
            {debugInfo && (
              <div className="mb-3 p-2 bg-gray-800/50 rounded border border-gray-600">
                <div className="font-semibold text-yellow-400 mb-1">Scroll Info:</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Scroll Top:</span>
                    <span className="text-blue-400">{debugInfo.scrollTop}px</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Scroll Height:</span>
                    <span className="text-blue-400">{debugInfo.scrollHeight}px</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Progress:</span>
                    <span className="text-blue-400">
                      {typeof (debugInfo as any)?.progressPercent === 'number' ? 
                        `${(debugInfo as any).progressPercent.toFixed(2)}%` : 'N/A'
                      }
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* API Test */}
            <div className="mb-3 p-2 bg-gray-800/50 rounded border border-gray-600">
              <div className="font-semibold text-yellow-400 mb-1">API Test:</div>
              <div className="space-y-1 text-xs">
                <button
                  onClick={async () => {
                    try {
                      console.log('🧪 Testing API...');
                      const response = await fetch('/api/test');
                      const data = await response.json();
                      console.log('🧪 Test API response:', data);
                      alert(`API Test: ${data.message}\nEnvironment: ${data.environment}\nVercel: ${data.vercel}`);
                    } catch (error) {
                      console.error('🧪 Test API error:', error);
                      alert('API Test failed: ' + error);
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                >
                  Test API
                </button>
                <button
                  onClick={async () => {
                    try {
                      console.log('🖼️ Testing Gallery API...');
                      const response = await fetch('/api/gallery/floor');
                      const data = await response.json();
                      console.log('🖼️ Gallery API response:', data);
                      alert(`Gallery API: ${data.length} images found\nFirst image: ${data[0]?.caption || 'None'}`);
                    } catch (error) {
                      console.error('🖼️ Gallery API error:', error);
                      alert('Gallery API failed: ' + error);
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs ml-2"
                >
                  Test Gallery
                </button>
              </div>
            </div>

            {/* Loader Info */}
            {debugInfo && (
              <div className="p-2 bg-gray-800/50 rounded border border-gray-600">
                <div className="font-semibold text-yellow-400 mb-1">Loader Info:</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Progress:</span>
                    <span className="text-blue-400">
                      {typeof (debugInfo as any)?.loaderPercent === 'number' ? 
                        `${(debugInfo as any).loaderPercent.toFixed(0)}%` : 'N/A'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Loaded:</span>
                    <span className="text-blue-400">
                      {typeof (debugInfo as any)?.loaderLoadedMB === 'number' ? 
                        `${(debugInfo as any).loaderLoadedMB.toFixed(2)} MB` : 'N/A'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="text-blue-400">
                      {typeof (debugInfo as any)?.loaderTotalMB === 'number' ? 
                        `${(debugInfo as any).loaderTotalMB.toFixed(2)} MB` : 'N/A'
                      }
                    </span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Hotspot Category Tooltip */}
      {hoverTooltip.visible && (
        <div
          className="fixed z-50 px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg shadow-lg transition-all    duration-100 ease-out"
          style={{
            left: hoverTooltip.position.x + 10,
            top: hoverTooltip.position.y - 40,
            opacity: hoverTooltip.visible ? 1 : 0,
            transform: `translateY(${hoverTooltip.visible ? '0' : '10px'})`,
          }}
        >
          {hoverTooltip.text}
        </div>
      )}
      
      {/* SwiperGallery Modal */}
      {galleryVisible && (
        <div 
          className="fixed inset-0 z-[50] flex items-center justify-center p-4"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => {
            // Block any clicks on the gallery container
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="relative w-full h-full max-w-6xl">
            {/* Debug Info - Centered */}
              {showDebug && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-black/70 text-white p-3 rounded-lg text-sm">
               <div className="text-center">
                 <div className="font-semibold mb-1">Gallery Debug Info</div>
                 Gallery Visible: {galleryVisible.toString()}<br/>
                 Images Count: {galleryImages.length}<br/>
                 Current Hotspot: {currentHotspot}
               </div>
             </div>
              )}
              <SwiperGallery
               images={galleryImages}
               onClose={onReturnToMainPath}
               mode="modal-fullscreen"
               triggerModal={galleryVisible}
               className="w-full h-full"
             />
          </div>
        </div>
      )}

      {/* CameraPathEditor3D now integrated into DockedNavigation panel */}
      
      {/* Loader Overlay Portal - Shows real loading progress */}
      {showLoader && (
        <LoaderOverlay 
          percent={loaderPercent} 
          loadedMB={loaderLoadedMB} 
          totalMB={loaderTotalMB} 
        />
      )}
    </>
  );
} 