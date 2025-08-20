"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { gsap } from "gsap";

interface ScrollSceneProps {
  sceneStage?: number;
  currentSection?: string;
  onIntroComplete?: () => void;
  onIntroStart?: () => void;
}

export default function ScrollScene({ 
  sceneStage = 0, 
  currentSection = 'hero',
  onIntroComplete,
  onIntroStart 
}: ScrollSceneProps) {
  // Scene configuration constants
  const CUBE_SIZE = 5;
  const CUBE_POSITION = new THREE.Vector3(0, 0, 0); // Centered on X-axis
  const FLOOR_SIZE = 80;
  const FLOOR_Y_POSITION = -2;
  const WALL_SIZE = 40;
  const WALL_HEIGHT = 6; // Height 6
  const WALL_THICKNESS = 1; // Wall thickness constant
  const WALL_Y_POSITION = 3; // Half of WALL_HEIGHT from Y=0
  const BACK_WALL_Z = -20;
  const LEFT_WALL_X = -20; // Equal distance from center
  const RIGHT_WALL_X = 20; // Equal distance from center
  const FRONT_WALL_Z = 20; // Add front wall position
  
  // Camera configuration
  const CAMERA_FOV = 75;
  const CAMERA_NEAR = 0.1;
  const CAMERA_FAR = 1000;
  const ORBITAL_HEIGHT = 30;
  const ORBITAL_RADIUS_MULTIPLIER = 6;
  const ORBITAL_SPEED = 0.2;
  
  // Animation configuration
  const INTRO_START_POS = new THREE.Vector3(0, 50, 3); // Start perfectly above the cube center
  const INTRO_END_POS = new THREE.Vector3(50, ORBITAL_HEIGHT, 0); // End at proper radius for centered scene
  const ORBITAL_START_POS = new THREE.Vector3(50, ORBITAL_HEIGHT, 0); // Explicit orbital start position
  const ANIMATION_STEPS = 100;
  const ANIMATION_STEP_INTERVAL = 17; // 17ms per step = ~1.7 seconds total
  
  // Colors - Dynamic based on theme
  const getThemeColors = () => {
    const isDark = document.documentElement.classList.contains('dark');
    
    if (isDark) {
      return {
        BACKGROUND_COLOR: 0x111827, // Dark background
        FLOOR_COLOR: 0x1f2937, // Dark floor
        WALL_COLOR: 0x04070E, // Dark walls
        CUBE_COLOR: 0x00ff00, // Green (keep same)
        CUBE_EMISSIVE_COLOR: 0x003300, // Dark green (keep same)
        GRID_COLOR_MAJOR: 0x444444, // Dark grid major lines
        GRID_COLOR_MINOR: 0x222222, // Dark grid minor lines
        AXES_COLOR: 0x666666 // Dark axes color
      };
    } else {
      return {
        BACKGROUND_COLOR: 0xf5f3ed, // BLANCO ROTO background
        FLOOR_COLOR: 0xccc1b1, // LINO floor
        WALL_COLOR: 0xffffff, // White walls
        CUBE_COLOR: 0x00ff00, // Green
        CUBE_EMISSIVE_COLOR: 0x003300, // Dark green
        GRID_COLOR_MAJOR: 0x888888, // Light grid major lines
        GRID_COLOR_MINOR: 0xcccccc, // Light grid minor lines
        AXES_COLOR: 0x333333 // Light axes color
      };
    }
  };
  
  // Toggle
  const WITH_INTRO = true; // Toggle to control intro vs orbital
  const WITH_HELPERS = false; // Toggle to show coordinate helpers
  const WITH_ORBITAL = false; // Toggle to enable orbital animation
  const SHOW_DEBUG = false; // Toggle to show/hide debug panel

  // Optional debug visuals for the camera path
  const SHOW_CAMERA_PATH = false;
  const SHOW_WAYPOINTS = false;
  
  const mountRef = useRef<HTMLDivElement>(null);
  const animationIdRef = useRef<number>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cubePos = useRef(CUBE_POSITION);
  const startTimeRef = useRef<number | null>(null);
  const loaderOverlayRef = useRef<HTMLDivElement | null>(null);
  const loaderBarRef = useRef<HTMLDivElement | null>(null);
  const loaderTextRef = useRef<HTMLElement | null>(null);
  const loaderInfoRef = useRef<HTMLDivElement | null>(null);
  const loaderLastPercentRef = useRef<number>(0);
  const loaderStyleRef = useRef<HTMLStyleElement | null>(null);
  const loaderTotalBytesRef = useRef<number | null>(null);
  const loaderLoadedBytesRef = useRef<number>(0);
  const loaderStartedRef = useRef<boolean>(false);
  const loaderResizeHandlerRef = useRef<(() => void) | null>(null);

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
  
  // GSAP-driven scroll path (preview path points and targets)
  const gsapCameraPoints = [
    new THREE.Vector3(-10, 3, 2),
    new THREE.Vector3(-9.5, 3, 9),
    new THREE.Vector3(-9, 3, 26),
    new THREE.Vector3(-2, 3, 26),
    new THREE.Vector3(18, 3, 26),
    new THREE.Vector3(18, 3, 0),
  ];
  const gsapLookAtTargets = [
    new THREE.Vector3(0, 0, 2),
    new THREE.Vector3(0, 0, 4),
    new THREE.Vector3(0, 1.0, 10),
    new THREE.Vector3(6, 1.2, -3),
    new THREE.Vector3(6, 1.8, 0),
  ];
  const gsapCurveRef = useRef<THREE.CatmullRomCurve3>(new THREE.CatmullRomCurve3(gsapCameraPoints, false, 'catmullrom', 0.1));
  const gsapLookAtTargetsRef = useRef<THREE.Vector3[]>(gsapLookAtTargets);
  const gsapLookCurveRef = useRef<THREE.CatmullRomCurve3 | null>(new THREE.CatmullRomCurve3(gsapLookAtTargets, false, 'catmullrom', 0.1));
  const pathProgressRef = useRef<{ t: number }>({ t: 0 });
  const gsapPathInitializedRef = useRef<boolean>(false);

  const updateCameraAlongCurve = (camera: THREE.PerspectiveCamera, t: number) => {
    const clampedT = Math.max(0, Math.min(1, t));
    const point = gsapCurveRef.current.getPointAt(clampedT);
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
      }));
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

  const addPathVisuals = (curve: THREE.CatmullRomCurve3) => {
    if (!sceneRef.current) return;
    removePathVisuals();
    if (SHOW_CAMERA_PATH) {
      const pts = curve.getPoints(300);
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color: 0x00ffff });
      const line = new THREE.Line(geom, mat);
      line.renderOrder = 999;
      sceneRef.current.add(line);
      pathLineRef.current = line;
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
    }
  };
  
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

  // Function to create and setup the scene
  const createScene = () => {
    const scene = new THREE.Scene();
    const colors = getThemeColors();
    
    // Lighting - Simple setup without shadows
    scene.add(new THREE.AmbientLight(0xffffff, 1));
    scene.add(new THREE.DirectionalLight(0xffffff, 1, 100));
    
    // Additional light source 45 degrees diagonally from cube to wall corner
    const cubeHeight = CUBE_SIZE; // 5 units
    const lightHeight = cubeHeight * 3; // 15 units above cube
    const diagonalDistance = 20; // Distance from cube center to wall corner
    
    const diagonalLight = new THREE.DirectionalLight(0xffffff, 1.5, 50);
    diagonalLight.position.set(
      diagonalDistance * Math.cos(Math.PI / 4), // 45 degrees X
      lightHeight, // 3 times cube height above
      diagonalDistance * Math.sin(Math.PI / 4)  // 45 degrees Z
    );
    diagonalLight.target.position.set(0, 0, 0); // Point at cube center
    diagonalLight.castShadow = true; // Enable shadow casting
    diagonalLight.shadow.mapSize.width = 2048;
    diagonalLight.shadow.mapSize.height = 2048;
    diagonalLight.shadow.camera.near = 0.1;
    diagonalLight.shadow.camera.far = 100;
    diagonalLight.shadow.camera.left = -30;
    diagonalLight.shadow.camera.right = 30;
    diagonalLight.shadow.camera.top = 30;
    diagonalLight.shadow.camera.bottom = -30;
    diagonalLight.shadow.bias = -0.0001;
    diagonalLight.shadow.color = 0x000000; // Pure black shadows
    scene.add(diagonalLight);
    scene.add(diagonalLight.target);
    
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
      createText('X', new THREE.Vector3(20, 0, 0), 0xff0000); // Red X-axis
      createText('Y', new THREE.Vector3(0, 20, 0), 0x00ff00); // Green Y-axis
      createText('Z', new THREE.Vector3(0, 0, 20), 0x0000ff); // Blue Z-axis
    }
    
    // Floor
    const floorMat = new THREE.MeshStandardMaterial({ color: colors.FLOOR_COLOR });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = FLOOR_Y_POSITION;
    floor.receiveShadow = true; // Enable shadow receiving
    scene.add(floor);
    
    // Walls
    // Removed: no walls are created or added to the scene

    // Load floor plan GLB model using dynamic import
    const loadFloorPlanModel = async () => {
      try {
        // Show loader immediately
        createLoaderOverlay();
        updateLoaderOverlay(0, 0, null);

        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        const gltfLoader = new GLTFLoader();
        const modelUrl = `/models/saska.glb?cb=${Date.now()}`;

        // Obtain total bytes via cache-busted HEAD so percent stays accurate
        try {
          const headRes = await fetch(modelUrl, { method: 'HEAD', cache: 'no-store' });
          const len = headRes.headers.get('content-length');
          if (len) {
            const total = parseInt(len, 10);
            if (!Number.isNaN(total) && total > 0) {
              loaderTotalBytesRef.current = total;
              updateLoaderOverlay(0, 0, total);
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

                  model.traverse((child: any) => {
                    if (child instanceof THREE.Mesh) {
                      child.castShadow = true;
                      child.receiveShadow = true;
                    }
                  });

                  scene.add(model);

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
                    startIntroAnimation(cameraRef.current, rendererRef.current, sceneRef.current);
                  }

                  const total = loaderTotalBytesRef.current;
                  const loaded = loaderLoadedBytesRef.current || (data?.byteLength ?? 0);
                  updateLoaderOverlay(100, loaded, total ?? loaded);
                } finally {
                  hideLoaderOverlay();
                }
              },
              (err: any) => {
                console.error('GLTF parse error:', err);
                hideLoaderOverlay();
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
              updateLoaderOverlay(pct, loaded, total);
            } else {
              // Unknown total: show MB and keep mid-width bar
              loaderLoadedBytesRef.current = loaded;
              if (loaderBarRef.current) loaderBarRef.current.style.width = `${Math.round(window.innerWidth * 0.5)}px`;
              if (loaderTextRef.current) loaderTextRef.current.textContent = `${bytesToMB(loaded).toFixed(2)} MB`;
            }
          },
          (err: any) => {
            console.error('FileLoader error:', err);
            hideLoaderOverlay();
            createFloorPlanPlaceholder();
          }
        );
      } catch (error) {
        console.error('Error importing GLTFLoader:', error);
        // Fallback to placeholder if loader fails
        createLoaderOverlay();
        updateLoaderOverlay(100, loaderLoadedBytesRef.current, loaderTotalBytesRef.current);
        setTimeout(hideLoaderOverlay, 500);
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
    
    // Load the floor plan model
    loadFloorPlanModel();
    
    // Cube
    const debugCube = new THREE.Mesh(
      new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE),
      new THREE.MeshStandardMaterial({ color: colors.CUBE_COLOR, emissive: colors.CUBE_EMISSIVE_COLOR })
    );
    debugCube.position.copy(cubePos.current);
    debugCube.castShadow = true; // Enable shadow casting
    debugCube.receiveShadow = true; // Enable shadow receiving
    scene.add(debugCube);
    
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
    const colors = getThemeColors();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(colors.BACKGROUND_COLOR, 1);
    renderer.shadowMap.enabled = true; // Enable shadow mapping
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Use soft shadows
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
        camera.lookAt(cubePos.current);
        
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
          }));
        }
        
        step++;
        introTimeoutRef.current = window.setTimeout(animateStep, ANIMATION_STEP_INTERVAL);
      } else {
        // Ensure camera is exactly at INTRO_END_POS
        camera.position.copy(INTRO_END_POS);
        camera.lookAt(cubePos.current);
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
        renderer.render(scene, camera);
        // Final intro camera position into debug
        if (setDebugInfo) {
          setDebugInfo((prev: any) => ({
            ...(prev || {}),
            cameraPos: [camera.position.x, camera.position.y, camera.position.z],
          }));
        }

        // Clear timer ref
        if (introTimeoutRef.current) {
          clearTimeout(introTimeoutRef.current);
          introTimeoutRef.current = null;
        }

        // Intro completed, enable orbital animation
        introCompletedRef.current = true;
        hasIntroRef.current = true;
        onIntroComplete?.(); // Call intro complete callback
        console.log('Intro completed');

        // Initialize GSAP curve to start at current camera position and render first frame
        if (!WITH_ORBITAL && cameraRef.current && rendererRef.current && sceneRef.current) {
          const startP = cameraRef.current.position.clone();
          const pts = [startP, ...gsapCameraPoints];
          gsapCurveRef.current = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1);
          // Build a smooth look-at curve, seeding the first point with intro look target (cube center)
          const lookPts = [cubePos.current.clone(), ...gsapLookAtTargets];
          gsapLookAtTargetsRef.current = lookPts;
          gsapLookCurveRef.current = new THREE.CatmullRomCurve3(lookPts, false, 'catmullrom', 0.1);
          gsapPathInitializedRef.current = true;
          pathProgressRef.current.t = 0;
          // Add visible path in the scene
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
      console.log('🚨 STILL IMAGE RENDER DETECTED - Animation starting');
    }
    
    // Get scroll information
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
    const progressPercent = progress * 100;
    
    // Calculate orbital position based on scroll when intro is complete
    let angle, radius;
    if (introCompletedRef.current && WITH_INTRO) {
      // Scroll-based orbital animation
      // Start from the exact intro end position (0 degrees for X=50, Z=0)
      const introEndAngle = 0; // Since INTRO_END_POS is (50, 25, 0), angle is 0
      // Start from intro end angle and add scroll progress
      angle = introEndAngle + (progress * Math.PI * 2);
      const introEndRadius = 50; // Distance from center
      radius = introEndRadius;
    } else {
      // Time-based orbital animation (for non-intro mode or during intro)
      const elapsedTime = (Date.now() - startTimeRef.current) * 0.001;
      // Start from the exact intro end position (0 degrees for X=50, Z=0)
      const introEndAngle = 0; // Since INTRO_END_POS is (50, 25, 0), angle is 0
      // Start from intro end angle and add time-based movement
      angle = introEndAngle + (elapsedTime * ORBITAL_SPEED);
      const introEndRadius = 50; // Distance from center
      radius = introEndRadius;
    }
    
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

  // Loader overlay helpers
  const createLoaderOverlay = () => {
    if (typeof window === 'undefined') return;
    if (loaderOverlayRef.current) return;

    // Inject keyframes once for indeterminate animation
    if (!loaderStyleRef.current) {
      const styleEl = document.createElement('style');
      styleEl.textContent = `@keyframes loaderIndeterminate{0%{background-position:0 0}100%{background-position:200% 0}}`;
      document.head.appendChild(styleEl);
      loaderStyleRef.current = styleEl;
    }

    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '12px';
    overlay.style.background = 'rgba(0,0,0,0.5)';
    overlay.style.zIndex = '2147483647';
    overlay.style.boxShadow = '0 2px 8px rgba(0,0,0,0.35)';
    overlay.style.pointerEvents = 'none';

    const bar = document.createElement('div');
    bar.style.height = '100%';
    bar.style.width = '0%';
    bar.style.background = 'linear-gradient(90deg,#22c55e,#06b6d4,#3b82f6)';
    bar.style.backgroundSize = '200% 100%';
    bar.style.transition = 'width 120ms ease-out';

    overlay.appendChild(bar);

    const pct = document.createElement('h1');
    pct.style.position = 'fixed';
    pct.style.top = '56px'; // move further below the bar
    pct.style.left = '50%';
    pct.style.transform = 'translateX(-50%)';
    pct.style.padding = '8px 14px';
    pct.style.borderRadius = '10px';
    pct.style.fontFamily = 'monospace';
    pct.style.fontSize = '24px';
    pct.style.fontWeight = '700';
    pct.style.letterSpacing = '0.5px';
    pct.style.color = '#fff';
    pct.style.background = 'rgba(0,0,0,0.7)';
    pct.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    pct.style.pointerEvents = 'none';
    pct.textContent = '0%';

    // Separate info div mirroring loader numbers
    const infoDiv = document.createElement('div');
    infoDiv.style.position = 'fixed';
    infoDiv.style.top = '96px';
    infoDiv.style.left = '50%';
    infoDiv.style.transform = 'translateX(-50%)';
    infoDiv.style.padding = '6px 12px';
    infoDiv.style.borderRadius = '8px';
    infoDiv.style.fontFamily = 'monospace';
    infoDiv.style.fontSize = '14px';
    infoDiv.style.color = '#fff';
    infoDiv.style.background = 'rgba(0,0,0,0.6)';
    infoDiv.style.boxShadow = '0 2px 8px rgba(0,0,0,0.25)';
    infoDiv.style.pointerEvents = 'none';
    infoDiv.style.zIndex = '2147483647';
    infoDiv.textContent = 'Percent: 0% | Loaded: N/A | Total: N/A';

    document.body.appendChild(overlay);
    document.body.appendChild(pct);
    document.body.appendChild(infoDiv);

    loaderOverlayRef.current = overlay;
    loaderBarRef.current = bar;
    loaderTextRef.current = pct;
    loaderInfoRef.current = infoDiv;
    loaderLastPercentRef.current = 0;

    // Keep bar width in sync with window width
    loaderResizeHandlerRef.current = () => {
      const percent = loaderLastPercentRef.current || 0;
      if (loaderBarRef.current) {
        const px = Math.max(0, (window.innerWidth * percent) / 100);
        loaderBarRef.current.style.width = `${px}px`;
      }
    };
    window.addEventListener('resize', loaderResizeHandlerRef.current);

    console.log('[LoaderOverlay] mounted');
  };

  const updateLoaderOverlay = (percent: number, loadedBytes?: number, totalBytes?: number | null) => {
    if (!loaderOverlayRef.current || !loaderBarRef.current || !loaderTextRef.current) return;
    const clamped = Math.max(0, Math.min(100, percent));
    loaderLastPercentRef.current = clamped;
    // determinate mode
    loaderBarRef.current.style.animation = '';
    // Width in pixels relative to window width, for precise sync
    const px = Math.max(0, (window.innerWidth * clamped) / 100);
    loaderBarRef.current.style.width = `${px}px`;

    let loadedMB: number | undefined;
    let totalMB: number | undefined;
    if (typeof loadedBytes === 'number') loadedMB = bytesToMB(loadedBytes);
    if (typeof totalBytes === 'number' && totalBytes > 0) totalMB = bytesToMB(totalBytes);

    // Build text exactly like the debug panel values
    const percentText = `${clamped.toFixed(0)}%`;
    const loadedText = typeof loadedMB === 'number' ? `${loadedMB.toFixed(2)} MB` : 'N/A';
    const totalText = typeof totalMB === 'number' ? `${totalMB.toFixed(2)} MB` : 'N/A';
    const fullText = `Percent: ${percentText} | Loaded: ${loadedText} | Total: ${totalText}`;
    loaderTextRef.current.textContent = fullText;
    if (loaderInfoRef.current) loaderInfoRef.current.textContent = fullText;

    // Also reflect in debug panel if available
    if (setDebugInfo) {
      setDebugInfo((prev: any) => ({
        ...(prev || {}),
        loaderPercent: clamped,
        loaderLoadedMB: loadedMB,
        loaderTotalMB: totalMB,
      }));
    }
  };

  const updateLoaderOverlayProgress = (evt: ProgressEvent<EventTarget>) => {
    if (!loaderOverlayRef.current || !loaderBarRef.current || !loaderTextRef.current) return;
    const totalKnown = !!loaderTotalBytesRef.current && loaderTotalBytesRef.current > 0;

    if ((evt as ProgressEvent).lengthComputable && (evt as ProgressEvent).total > 0) {
      const loaded = (evt as ProgressEvent).loaded;
      const total = (evt as ProgressEvent).total;
      loaderLoadedBytesRef.current = loaded;
      loaderTotalBytesRef.current = total;
      const percent = (loaded / total) * 100;
      loaderLastPercentRef.current = percent;
      updateLoaderOverlay(percent, loaded, total);
    } else if (totalKnown) {
      // Use known total even if event is not lengthComputable
      const loaded = typeof (evt as ProgressEvent).loaded === 'number' ? (evt as ProgressEvent).loaded : loaderLoadedBytesRef.current;
      loaderLoadedBytesRef.current = loaded;
      const total = loaderTotalBytesRef.current as number;
      const percent = Math.min(99, (loaded / total) * 100);
      loaderLastPercentRef.current = percent;
      updateLoaderOverlay(percent, loaded, total);
    } else {
      // indeterminate mode: animate bar and show MB loaded
      loaderBarRef.current.style.animation = 'loaderIndeterminate 1.2s linear infinite';
      loaderBarRef.current.style.width = '50%';
      const loaded = (evt as ProgressEvent).loaded || 0;
      loaderLoadedBytesRef.current = loaded;
      const loadedMB = bytesToMB(loaded);
      loaderTextRef.current.textContent = `${loadedMB.toFixed(2)} MB`;
    }
  };

  const hideLoaderOverlay = () => {
    if (loaderOverlayRef.current) {
      loaderOverlayRef.current.remove();
      loaderOverlayRef.current = null;
    }
    if (loaderTextRef.current) {
      loaderTextRef.current.remove();
      loaderTextRef.current = null;
    }
    if (loaderInfoRef.current) {
      loaderInfoRef.current.remove();
      loaderInfoRef.current = null;
    }
    if (loaderResizeHandlerRef.current) {
      window.removeEventListener('resize', loaderResizeHandlerRef.current);
      loaderResizeHandlerRef.current = null;
    }
    loaderBarRef.current = null;
    loaderLastPercentRef.current = 0;
  };

  // Theme change listener
  useEffect(() => {
    const handleThemeChange = () => {
      if (rendererRef.current && sceneRef.current) {
        const colors = getThemeColors();
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
          // Don’t force a render that would show a pre-intro still
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

  // Main animation loop
  const animate = (camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, scene: THREE.Scene) => {
    // Append renderer to DOM on first frame to prevent static render
    if (!renderer.domElement.parentNode) {
      mountRef.current?.appendChild(renderer.domElement);
    }
    
    // Initialize GSAP curve to start exactly at the current camera position once intro completes
    if (introCompletedRef.current && !gsapPathInitializedRef.current && cameraRef.current) {
      const startP = cameraRef.current.position.clone();
      const pts = [startP, ...gsapCameraPoints];
      gsapCurveRef.current = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1);
      const lookPts = [cubePos.current.clone(), ...gsapLookAtTargets];
      gsapLookAtTargetsRef.current = lookPts;
      gsapLookCurveRef.current = new THREE.CatmullRomCurve3(lookPts, false, 'catmullrom', 0.1);
      gsapPathInitializedRef.current = true;
      pathProgressRef.current.t = 0;
    }

    // Run orbital animation if intro is complete OR if we're skipping intro
    if (WITH_ORBITAL && (introCompletedRef.current || !WITH_INTRO)) {
      animateOrbital(camera, renderer, scene);
    } else if (introCompletedRef.current) {
      // Render GSAP scroll path when orbital is disabled
      updateCameraAlongCurve(camera, pathProgressRef.current.t);
      renderer.render(scene, camera);
    }
    
    animationIdRef.current = requestAnimationFrame(() => animate(camera, renderer, scene));
  };

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
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const st = window.pageYOffset || doc.scrollTop;
      const sh = (doc.scrollHeight - window.innerHeight) || 0;
      const targetT = sh > 0 ? st / sh : pathProgressRef.current.t;
      const t = Math.max(0, Math.min(1, targetT));
      // tween toward target for smoothness
      gsap.to(pathProgressRef.current, {
        t,
        duration: 0.4,
        ease: 'power2.out',
        onUpdate: () => {
          if (introCompletedRef.current && cameraRef.current && sceneRef.current && rendererRef.current) {
            updateCameraAlongCurve(cameraRef.current, pathProgressRef.current.t);
            rendererRef.current.render(sceneRef.current, cameraRef.current);
          }
        },
      });
      if (setDebugInfo) {
        setDebugInfo((prev: any) => ({ ...(prev || {}), progress: t, progressPercent: t * 100 }));
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true } as any);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll as any);
  }, []);

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
      {SHOW_DEBUG && debugInfo && (
        <div
          style={{
            position: "fixed",
            top: "10px",
            left: "10px",
            background: "rgba(0,0,0,0.9)",
            color: "white",
            padding: "12px",
            borderRadius: "6px",
            zIndex: 10000,
            fontSize: "12px",
            lineHeight: "1.4",
            fontFamily: "monospace",
            minWidth: "200px",
            border: "1px solid rgba(255,255,255,0.2)"
          }}
        >
          <div><strong>Camera Position:</strong></div>
          <div>X: {Array.isArray((debugInfo as any)?.cameraPos) ? (debugInfo as any).cameraPos[0].toFixed(2) : 'N/A'}</div>
          <div>Y: {Array.isArray((debugInfo as any)?.cameraPos) ? (debugInfo as any).cameraPos[1].toFixed(2) : 'N/A'}</div>
          <div>Z: {Array.isArray((debugInfo as any)?.cameraPos) ? (debugInfo as any).cameraPos[2].toFixed(2) : 'N/A'}</div>
          <div style={{marginTop: "8px"}}><strong>Scroll Info:</strong></div>
          <div>Top: {debugInfo.scrollTop}px</div>
          <div>Height: {debugInfo.scrollHeight}px</div>
          <div>Progress: {typeof (debugInfo as any)?.progressPercent === 'number' ? (debugInfo as any).progressPercent.toFixed(2) + '%' : 'N/A'}</div>
          <div style={{marginTop: "8px"}}><strong>Window:</strong></div>
          <div>Width: {debugInfo.windowWidth}px</div>
          <div>Height: {debugInfo.windowHeight}px</div>
          <div style={{marginTop: "8px"}}><strong>Current Section:</strong></div>
          <div>{debugInfo.currentSection}</div>
          <div style={{marginTop: "8px"}}><strong>Scene Stage:</strong></div>
          <div>{sceneStage}</div>
          <div style={{marginTop: "8px"}}><strong>Intro Status:</strong></div>
          <div>Completed: {introCompletedRef.current ? 'Yes' : 'No'}</div>
          <div>With Intro: {WITH_INTRO ? 'Yes' : 'No'}</div>
          <div style={{marginTop: "8px"}}><strong>Loader Info:</strong></div>
          <div>Percent: {typeof (debugInfo as any)?.loaderPercent === 'number' ? `${(debugInfo as any).loaderPercent.toFixed(0)}%` : 'N/A'}</div>
          <div>Loaded: {typeof (debugInfo as any)?.loaderLoadedMB === 'number' ? `${(debugInfo as any).loaderLoadedMB.toFixed(2)} MB` : 'N/A'}</div>
          <div>Total: {typeof (debugInfo as any)?.loaderTotalMB === 'number' ? `${(debugInfo as any).loaderTotalMB.toFixed(2)} MB` : 'N/A'}</div>
        </div>
      )}
    </>
  );
} 