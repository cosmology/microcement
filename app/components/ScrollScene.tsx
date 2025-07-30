"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface ScrollSceneProps {
  sceneStage?: number;
}

export default function ScrollScene({ sceneStage = 0 }: ScrollSceneProps) {
  // Scene configuration constants
  const CUBE_SIZE = 5;
  const CUBE_POSITION = new THREE.Vector3(10, 0, 3);
  const FLOOR_SIZE = 80;
  const FLOOR_Y_POSITION = -2;
  const WALL_SIZE = 40;
  const WALL_HEIGHT = 20;
  const WALL_Y_POSITION = 8;
  const BACK_WALL_Z = -20;
  const LEFT_WALL_X = -10;
  const RIGHT_WALL_X = 30;
  
  // Camera configuration
  const CAMERA_FOV = 45;
  const CAMERA_NEAR = 0.1;
  const CAMERA_FAR = 1000;
  const ORBITAL_HEIGHT = 25;
  const ORBITAL_RADIUS_MULTIPLIER = 6;
  const ORBITAL_SPEED = 0.2;
  
  // Animation configuration
  const INTRO_START_POS = new THREE.Vector3(0, ORBITAL_HEIGHT, 0);
  const INTRO_END_POS = new THREE.Vector3(45, ORBITAL_HEIGHT, 0);
  const ORBITAL_START_POS = INTRO_END_POS;//new THREE.Vector3(80, ORBITAL_HEIGHT, 50);
  const ANIMATION_STEPS = 100;
  const ANIMATION_STEP_INTERVAL = 17; // 17ms per step = ~1.7 seconds total
  
  // Colors
  const FLOOR_COLOR = 0x0000ff; // Blue
  const WALL_COLOR = 0xcccccc; // Gray
  const CUBE_COLOR = 0x00ff00; // Green
  const CUBE_EMISSIVE_COLOR = 0x003300; // Dark green
  const BACKGROUND_COLOR = 0xff0000; // Red
  
  // Toggle
  const WITH_INTRO = true; // Toggle to control intro vs orbital
  
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

  // Function to create and setup the scene
  const createScene = () => {
    const scene = new THREE.Scene();
    
    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 1));
    scene.add(new THREE.DirectionalLight(0xffffff, 1, 100));
    
    // Floor
    const floorMat = new THREE.MeshStandardMaterial({ color: FLOOR_COLOR });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = FLOOR_Y_POSITION;
    scene.add(floor);
    
    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: WALL_COLOR });
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(WALL_SIZE, WALL_HEIGHT), wallMat);
    backWall.position.set(10, WALL_Y_POSITION, BACK_WALL_Z);
    scene.add(backWall);
    
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(WALL_SIZE, WALL_HEIGHT), wallMat);
    leftWall.position.set(LEFT_WALL_X, WALL_Y_POSITION, 0);
    leftWall.rotation.y = Math.PI / 2;
    scene.add(leftWall);
    
    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(WALL_SIZE, WALL_HEIGHT), wallMat);
    rightWall.position.set(RIGHT_WALL_X, WALL_Y_POSITION, 0);
    rightWall.rotation.y = -Math.PI / 2;
    scene.add(rightWall);
    
    // Cube
    const debugCube = new THREE.Mesh(
      new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE),
      new THREE.MeshStandardMaterial({ color: CUBE_COLOR, emissive: CUBE_EMISSIVE_COLOR })
    );
    debugCube.position.copy(cubePos.current);
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
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(BACKGROUND_COLOR, 1);
    // Don't append to DOM yet - wait for animation to start
    return renderer;
  };

  // Function to handle intro animation
  const startIntroAnimation = (camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, scene: THREE.Scene) => {
    let step = 0;
    
    const animateStep = () => {
      if (step < ANIMATION_STEPS) {
        const t = step / ANIMATION_STEPS;
        const { fromPos, toPos } = introAnimRef.current;
        
        const newPos = new THREE.Vector3(
          fromPos.x + (toPos.x - fromPos.x) * t,
          fromPos.y + (toPos.y - fromPos.y) * t,
          fromPos.z + (toPos.z - fromPos.z) * t
        );
        
        camera.position.copy(newPos);
        camera.lookAt(cubePos.current);
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
        renderer.render(scene, camera);
        
        step++;
        setTimeout(animateStep, ANIMATION_STEP_INTERVAL);
      } else {
        // Intro completed, enable orbital animation
        introCompletedRef.current = true;
        hasIntroRef.current = true;
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
    
    // Calculate time since animation started for consistent motion
    const elapsedTime = (Date.now() - startTimeRef.current) * 0.001;
    const angle = elapsedTime * ORBITAL_SPEED;
    
    // Calculate orbital radius based on intro end position to ensure smooth transition
    const introEndRadius = Math.sqrt(INTRO_END_POS.x * INTRO_END_POS.x + INTRO_END_POS.z * INTRO_END_POS.z);
    const radius = introEndRadius; // Use same radius as intro end position
    
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
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 10
      }}
    >
      <div
        ref={mountRef}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
} 