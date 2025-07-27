"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface ScrollSceneProps {
  sceneStage?: number;
}

export default function ScrollScene({ sceneStage = 0 }: ScrollSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const animationIdRef = useRef<number>();
  const cubePos = useRef(new THREE.Vector3(10, 0, 3));
  const lastLoggedProgress = useRef(-1);
  const hasIntroRef = useRef(false); // Track if intro is complete
  const introCompletedRef = useRef(false); // Track intro completion
  const introAnimRef = useRef({
    fromPos: new THREE.Vector3(100, 30, 60), // Start from much further away
    toPos: new THREE.Vector3(15, 5, 10), // End closer to cube for better view
    t: 0
  });
  const [debugInfo, setDebugInfo] = useState<{
    cameraPos: number[];
    scrollTop: number;
    scrollHeight: number;
    progress: number;
    progressPercent: number;
    windowHeight: number;
    windowWidth: number;
  } | null>(null);
  const [isAnimationFixed, setIsAnimationFixed] = useState(false);
  const [introComplete, setIntroComplete] = useState(true); // Always show scene as background

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0xff0000, 1);
    mountRef.current.appendChild(renderer.domElement);
    
    // Debug: Check if canvas is visible
    console.log('Canvas added to DOM:', renderer.domElement);
    console.log('Canvas dimensions:', renderer.domElement.width, 'x', renderer.domElement.height);
    console.log('Mount ref dimensions:', mountRef.current.offsetWidth, 'x', mountRef.current.offsetHeight);

    // Log instances after creation
    console.log("Scene instance:", scene);
    console.log("Camera instance:", camera);
    console.log("Renderer instance:", renderer);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 1));
    // Floor
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x8B7355 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2;
    scene.add(floor);
    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), wallMat);
    backWall.position.set(10, 8, -20);
    scene.add(backWall);
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), wallMat);
    leftWall.position.set(-10, 8, 0);
    leftWall.rotation.y = Math.PI / 2;
    scene.add(leftWall);
    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), wallMat);
    rightWall.position.set(30, 8, 0);
    rightWall.rotation.y = -Math.PI / 2;
    scene.add(rightWall);
    // Cube
    const debugCube = new THREE.Mesh(
      new THREE.BoxGeometry(3, 3, 3),
      new THREE.MeshStandardMaterial({ color: 0x00ff00 })
    );
    debugCube.position.copy(cubePos.current);
    scene.add(debugCube);

    // Add a camera indicator sphere that moves with the camera
    const cameraIndicator = new THREE.Mesh(
      new THREE.SphereGeometry(1, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
    );
    scene.add(cameraIndicator);

    cameraRef.current = camera;
    sceneRef.current = scene;
    rendererRef.current = renderer;
    
    // Set camera to starting position immediately
    camera.position.copy(introAnimRef.current.fromPos);
    camera.lookAt(cubePos.current);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    console.log('Camera set to starting position:', camera.position.toArray());
    console.log('Intro animation ref - fromPos:', introAnimRef.current.fromPos.toArray(), 'toPos:', introAnimRef.current.toPos.toArray());
    
    // Step-by-step animation
    let step = 0;
    const totalSteps = 100;
    const stepInterval = 50; // 50ms per step = 5 seconds total
    
    const animateStep = () => {
      if (step < totalSteps) {
        const t = step / totalSteps;
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
        
        console.log(`Step ${step}/${totalSteps} - Camera pos:`, camera.position.toArray(), 't:', t);
        
        step++;
        setTimeout(animateStep, stepInterval);
      } else {
        console.log('Animation completed - Camera at:', camera.position.toArray());
      }
    };
    
    // Start animation after 1 second
    setTimeout(animateStep, 1000);
    
    // Force initial render to show starting position
    renderer.render(scene, camera);

    // Animation loop
    function animate() {
      // Always run intro animation until it's complete
      if (!introCompletedRef.current) {
        // Intro animation - play this first regardless of scroll
        let { fromPos, toPos, t } = introAnimRef.current;
        
        if (t < 1) {
          t = Math.min(t + 0.005, 1); // Much slower animation for smooth movement
          // Use linear interpolation for smooth movement
          const newPos = new THREE.Vector3(
            fromPos.x + (toPos.x - fromPos.x) * t,
            fromPos.y + (toPos.y - fromPos.y) * t,
            fromPos.z + (toPos.z - fromPos.z) * t
          );
          camera.position.copy(newPos);
          camera.lookAt(cubePos.current);
          camera.updateProjectionMatrix();
          camera.updateMatrixWorld();
          introAnimRef.current.t = t;
          console.log('Intro anim - Camera pos:', camera.position.toArray(), 't:', t);
        } else {
          // Ensure camera is at exact end position
          camera.position.copy(toPos);
          camera.lookAt(cubePos.current);
          camera.updateProjectionMatrix();
          camera.updateMatrixWorld();
          introCompletedRef.current = true; // Mark intro as permanently complete
          hasIntroRef.current = true;
          console.log('Intro animation completed - Camera at:', camera.position.toArray());
        }
      } else {
        // INTRO ANIMATION COMPLETED - KEEP CAMERA AT FINAL POSITION
        // Camera stays at the final intro position as background
        // Move camera indicator to show camera position
        cameraIndicator.position.copy(camera.position);
        
        // Update debug info
        setDebugInfo({
          cameraPos: camera.position.toArray(),
          scrollTop: 0,
          scrollHeight: 0,
          progress: 0,
          progressPercent: 0,
          windowHeight: window.innerHeight,
          windowWidth: window.innerWidth
        });
      }
      // Always render every frame
      renderer.render(scene, camera);
      animationIdRef.current = requestAnimationFrame(animate);
    }
    console.log('Starting animation loop...');
    // Temporarily disable animation loop to test camera movement
    // animate();

    // Resize handler
    function handleResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
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
          background: "rgba(255,0,0,0.1)",
          zIndex: 10
        }}
      >
        <div
          ref={mountRef}
          style={{ width: "100vw", height: "100vh", position: "relative" }}
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
          <div>Width: {typeof window !== 'undefined' ? window.innerWidth : 'N/A'}px</div>
          <div>Height: {typeof window !== 'undefined' ? window.innerHeight : 'N/A'}px</div>
          <div style={{marginTop: "8px"}}><strong>Page Height:</strong> {debugInfo.scrollHeight + (typeof window !== 'undefined' ? window.innerHeight : 0)}px</div>
          <div style={{marginTop: "8px"}}><strong>Intro Complete:</strong> {introComplete ? 'Yes' : 'No'}</div>
        </div>
      )}
    </>
  );
} 