"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

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
  const WALL_HEIGHT = 20;
  const WALL_Y_POSITION = 8;
  const BACK_WALL_Z = -20;
  const LEFT_WALL_X = -20; // Equal distance from center
  const RIGHT_WALL_X = 20; // Equal distance from center
  
  // Camera configuration
  const CAMERA_FOV = 75;
  const CAMERA_NEAR = 0.1;
  const CAMERA_FAR = 1000;
  const ORBITAL_HEIGHT = 25;
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
  const WITH_HELPERS = true; // Toggle to show coordinate helpers
  
  const mountRef = useRef<HTMLDivElement>(null);
  const animationIdRef = useRef<number>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cubePos = useRef(CUBE_POSITION);
  const startTimeRef = useRef<number | null>(null);
  
  const introAnimRef = useRef({
    fromPos: INTRO_START_POS,
    toPos: INTRO_END_POS,
    t: 0
  });
  
  const hasIntroRef = useRef(false); // Track if intro is complete
  const introCompletedRef = useRef(false); // Track intro completion
  const orbitalReachedRef = useRef(false);
  
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
    const wallMat = new THREE.MeshStandardMaterial({ color: colors.WALL_COLOR });
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(WALL_SIZE, WALL_HEIGHT), wallMat);
    backWall.position.set(0, WALL_Y_POSITION, BACK_WALL_Z); // Centered on X-axis
    backWall.receiveShadow = true; // Enable shadow receiving
    backWall.castShadow = true; // Enable shadow casting
    scene.add(backWall);
    
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(WALL_SIZE, WALL_HEIGHT), wallMat);
    leftWall.position.set(LEFT_WALL_X, WALL_Y_POSITION, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true; // Enable shadow receiving
    leftWall.castShadow = true; // Enable shadow casting
    scene.add(leftWall);
    
    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(WALL_SIZE, WALL_HEIGHT), wallMat);
    rightWall.position.set(RIGHT_WALL_X, WALL_Y_POSITION, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true; // Enable shadow receiving
    rightWall.castShadow = true; // Enable shadow casting
    scene.add(rightWall);
    
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
    // Call intro start callback
    onIntroStart?.();
    
    let step = 0;
    
    const animateStep = () => {
      if (step < ANIMATION_STEPS) {
        const t = step / ANIMATION_STEPS;
        
        // Apply easing function for smoother animation
        const easedT = 1 - Math.pow(1 - t, 3); // Ease-out cubic
        
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
        renderer.render(scene, camera);
        
        step++;
        setTimeout(animateStep, ANIMATION_STEP_INTERVAL);
      } else {
        // Ensure camera is exactly at INTRO_END_POS
        camera.position.copy(INTRO_END_POS);
        camera.lookAt(cubePos.current);
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
        renderer.render(scene, camera);
        
        // Intro completed, enable orbital animation
        introCompletedRef.current = true;
        hasIntroRef.current = true;
        onIntroComplete?.(); // Call intro complete callback
        console.log('Intro completed, orbital animation enabled');
      }
    };
    
    setTimeout(animateStep, 1000);
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
    setDebugInfo({
      cameraPos: [orbitalX, orbitalY, orbitalZ],
      scrollTop,
      scrollHeight,
      progress,
      progressPercent,
      windowHeight: window.innerHeight,
      windowWidth: window.innerWidth,
      currentSection
    });
    
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
          rendererRef.current.render(sceneRef.current, cameraRef.current);
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
    
    // Run orbital animation if intro is complete OR if we're skipping intro
    if (introCompletedRef.current || !WITH_INTRO) {
      animateOrbital(camera, renderer, scene);
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
      renderer.render(scene, camera);
      console.log('Initial render completed - camera at:', camera.position.toArray());
      startIntroAnimation(camera, renderer, scene);
    } else {
      // Skip intro, go straight to orbital
      introCompletedRef.current = true;
      hasIntroRef.current = true;
      console.log('Skipping intro, going straight to orbital animation');
    }
    
    // Start animation loop
    animate(camera, renderer, scene);
    
    // Add resize listener
    const resizeHandler = () => handleResize(camera, renderer);
    window.addEventListener("resize", resizeHandler);

    // Cleanup
    return () => {
      window.removeEventListener("resize", resizeHandler);
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
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
      {debugInfo && (
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
          <div>X: {debugInfo.cameraPos[0].toFixed(2)}</div>
          <div>Y: {debugInfo.cameraPos[1].toFixed(2)}</div>
          <div>Z: {debugInfo.cameraPos[2].toFixed(2)}</div>
          <div style={{marginTop: "8px"}}><strong>Scroll Info:</strong></div>
          <div>Top: {debugInfo.scrollTop}px</div>
          <div>Height: {debugInfo.scrollHeight}px</div>
          <div>Progress: {debugInfo.progressPercent.toFixed(2)}%</div>
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
        </div>
      )}
    </>
  );
} 