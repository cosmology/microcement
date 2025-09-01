"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import SwiperGallery, { GalleryImage } from './SwiperGallery';
import { isMobile } from '../../lib/utils';


interface ScrollSceneProps {
  sceneStage?: number;
  currentSection?: string;
  onIntroComplete?: () => void;
  onIntroStart?: () => void;
  onDebugUpdate?: (data: any) => void;
}

export default function ScrollScene({ 
  sceneStage = 0, 
  currentSection = 'hero',
  onIntroComplete,
  onIntroStart,
  onDebugUpdate
}: ScrollSceneProps) {

  // Toggle flags
  const WITH_INTRO = true; // Toggle to control intro vs orbital
  const WITH_HELPERS = false; // Toggle to show coordinate helpers (floor grid, axes)
  const WITH_ORBITAL = false; // Toggle to enable orbital animation
  const SHOW_CUBE = false; // Toggle to show/hide the green debug cube
  const [showDebug, setShowDebug] = useState(true); // Toggle to show/hide debug panel
  const [showPosition, setShowPosition] = useState(true); // Toggle to show/hide position panel
  // Optional debug visuals for the camera path
  const SHOW_CAMERA_PATH = false;
  const SHOW_WAYPOINTS = false;
  
  // Hotspot highlight colors
  const HOTSPOT_HIGHLIGHT_COLOR = 0x00ff00; // Bright green for model hotspots
  const CUBE_HIGHLIGHT_COLOR = 0xff0000; // Red for cube
  const CUBE_NORMAL_COLOR = 0x00ff00; // Green for cube normal state
  
  // Array of pastel light colors for hotspots
  const PASTEL_COLORS = [
    0xFFB3BA, // Light pink
    0xBAFFC9, // Light mint
    0xBAE1FF, // Light blue
    0xFFFFBA, // Light yellow
    0xFFB3F7, // Light purple
    0xB3FFE6, // Light teal
    0xFFD4B3, // Light peach
    0xD4B3FF, // Light lavender
    0xB3FFB3, // Light green
    0xFFE6B3, // Light orange
    0xB3D4FF, // Light sky blue
    0xFFB3D4, // Light rose
  ];

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
        BACKGROUND_COLOR: 0x111827, // Dark background (reverted)
        FLOOR_COLOR: 0x1f2937, // Dark floor
        WALL_COLOR: 0x04070E, // Dark walls
        CUBE_COLOR: 0x00ff00, // Green (keep same)
        CUBE_EMISSIVE_COLOR: 0x003300, // Dark green (keep same)
        GRID_COLOR_MAJOR: 0x444444, // Dark grid major lines
        GRID_COLOR_MINOR: 0x222222, // Dark grid minor lines
        AXES_COLOR: 0x666666, // Dark axes color
        HOTSPOT_NORMAL_COLOR: 0xC1B6A6, // LINO
      };
    } else {
      return {
        BACKGROUND_COLOR: 0xf5f3ed, // BLANCO ROTO background (reverted)
        FLOOR_COLOR: 0xccc1b1, // LINO floor
        WALL_COLOR: 0xffffff, // White walls
        CUBE_COLOR: 0x00ff00, // Green
        CUBE_EMISSIVE_COLOR: 0x003300, // Dark green
        GRID_COLOR_MAJOR: 0x888888, // Light grid major lines
        GRID_COLOR_MINOR: 0xcccccc, // Light grid minor lines
        AXES_COLOR: 0x333333, // Light axes color
        HOTSPOT_NORMAL_COLOR: 0xC1B6A6, // LINO
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
  
  
  // GSAP-driven scroll path (preview path points and targets)
  const gsapCameraPoints = [
    new THREE.Vector3(20, 5, 0),
    new THREE.Vector3(-8, 6.5, 2),
    new THREE.Vector3(-14, 6.75, 7),
    new THREE.Vector3(-10, 7, 27),
    new THREE.Vector3(-4, 7, 30),
    new THREE.Vector3(-2, 7.25, 32),
    new THREE.Vector3(18, 7.5, 32),
    new THREE.Vector3(20, 8, 20),
  ];
  const gsapLookAtTargets = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 3, 0),
    new THREE.Vector3(0, 4, 0),
    new THREE.Vector3(0, 5, 30),
    new THREE.Vector3(10, 6, 50),
    new THREE.Vector3(20, 7, 60),
    new THREE.Vector3(30, 8, 40),
    new THREE.Vector3(0, 0, -18),
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
    window.addEventListener('wheel', wheelHandler, { passive: true });
    window.addEventListener('touchstart', touchStartHandler, { passive: true });
    window.addEventListener('touchmove', touchMoveHandler, { passive: true });
    window.addEventListener('touchend', touchEndHandler, { passive: true });
    window.addEventListener('scroll', scrollHandler, { passive: true });
    window.addEventListener('click', clickHandler, { passive: true });
    window.addEventListener('keydown', keyHandler, { passive: true });

    return () => {
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
      console.log('📱 Touch end detected');
    };
    
    const wheelHandler = () => {
      setEventCounts(prev => ({ ...prev, wheel: prev.wheel + 1 }));
      console.log('🖱️ Wheel event detected');
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
      // Extract the category from hotspot name (e.g., "Hotspot_geo_floor" -> "floor")

      const category = hotspotName.replace('Hotspot_geo_', '');
      
      // Try API first, then fallback to static data
      const encodedCategory = encodeURIComponent(category);
      const requestUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/api/gallery/${encodedCategory}`
        : `/api/gallery/${encodedCategory}`;
      const response = await fetch(requestUrl, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
      });
      console.log('🖼️ API requestUrl:', requestUrl);
      console.log('🖼️ API response status:', response.status);
      console.log('🖼️ API response ok:', response.ok);

      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const text = await response.text();
          throw new Error(`Invalid content-type: ${contentType}. Body starts with: ${text.slice(0, 200)}`);
        }
        const images = await response.json();
        setGalleryImages(images);
      } else {
        const errorText = await response.text().catch(() => '');
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

  // Configuration for focal distances for each hotspot
  // Customize these values to control how close the camera gets to each hotspot
  // Lower values = closer camera, Higher values = farther camera
  const HOTSPOT_FOCAL_DISTANCES: { [key: string]: number } = {
    
    "Hotspot_geo_accent_wall": 8,
    "Hotspot_geo_backsplash": 5,
    "Hotspot_geo_kitchen_cabinet": 5,
    "Hotspot_geo_bath_countertop": 5,
    "Hotspot_geo_floor": 10,
    "Hotspot_geo_fireplace": 12,
    "Hotspot_geo_coffee_table": 5,
    "Hotspot_geo_kitchen_countertop": 5,
    "Hotspot_geo_island": 10,
    "Hotspot_geo_shelves": 5,
  };

  // Hotspot category mapping for display labels
  const HOTSPOT_CATEGORIES: { [key: string]: string } = {
    "Hotspot_geo_shelves": "Furniture",
    "Hotspot_geo_accent_wall": "Accent Wall",
    "Hotspot_geo_bath_countertop": "Bath Countertops",
    "Hotspot_geo_kitchen_cabinet": "Kitchen Cabinets",
    "Hotspot_geo_fireplace": "Fireplaces",
    "Hotspot_geo_floor": "Floors",
    "Hotspot_geo_kitchen_countertop": "Kitchen Countertops",
    "Hotspot_geo_coffee_table": "Furniture",
    "Hotspot_geo_island": "Kitchen Islands",
    "Hotspot_geo_backsplash": "Kitchen Backsplashes",
    "Hotspot_geo_bathroom_walls": "Bathroom Walls"
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

  // Function to create purple pulsing spheres for hotspots (mobile only)
  const createHotspotPulseMarkers = () => {
    // Only create pulse markers on mobile devices
    if (!isMobile.detect()) {
      console.log('🎯 Desktop detected, skipping pulse marker creation');
      return;
    }
    
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
      
      // Create the main pulse sphere (50% smaller)
      const pulseGeometry = new THREE.SphereGeometry(0.4, 16, 16); // Reduced from 0.8 to 0.4 (50% smaller)
      const pulseMaterial = new THREE.MeshBasicMaterial({
        color: 0x8B5CF6, // Purple color
        transparent: true,
        opacity: 0.6
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
      
      // Create glow effect (50% smaller)
      const glowGeometry = new THREE.SphereGeometry(0.5, 16, 16); // Reduced from 1.0 to 0.5 (50% smaller)
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x8B5CF6,
        transparent: true,
        opacity: 0.3
      });
      glowMaterial.depthWrite = false;
      glowMaterial.depthTest = true; // Enable depth testing for proper layering
      glowMaterial.blending = THREE.AdditiveBlending;
      
      const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
      glowSphere.position.copy(pulseSphere.position);
      glowSphere.renderOrder = 1001; // Even higher render order for glow
      glowSphere.frustumCulled = false; // Ensure visibility
      
      // Add both spheres to the group
      pulseGroup.add(pulseSphere);
      pulseGroup.add(glowSphere);
      
      // Store references for animation
      hotspotPulseRefs.current[index * 2] = pulseSphere;
      hotspotPulseRefs.current[index * 2 + 1] = glowSphere;
      
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
    
    // Start pulse animation
    animateHotspotPulses();
    
    // Add cursor pointer CSS to the document for pulse markers
    addPulseMarkerCursorStyles();
  };

  // Function to animate the pulse markers
  const animateHotspotPulses = () => {
    if (!hotspotPulseRefs.current.length) return;
    
    const time = Date.now() * 0.003; // Slower animation
    
    hotspotPulseRefs.current.forEach((pulseMesh, index) => {
      if (!pulseMesh || !pulseMesh.material) return;
      
      const material = pulseMesh.material as THREE.MeshBasicMaterial;
      const baseOpacity = index % 2 === 0 ? 0.6 : 0.3; // Main sphere vs glow
      const pulseSpeed = index % 2 === 0 ? 1 : 0.7; // Different speeds for variety
      
      // Create pulsing effect
      const pulse = Math.sin(time * pulseSpeed) * 0.3 + 0.7;
      material.opacity = baseOpacity * pulse;
      
      // Scale effect for main spheres only
      if (index % 2 === 0) {
        const scale = 0.8 + Math.sin(time * 1.2) * 0.2;
        pulseMesh.scale.setScalar(scale);
      }
    });
    
    // Continue animation
    pulseAnimationRef.current = requestAnimationFrame(animateHotspotPulses);
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
    // Only work on mobile devices
    if (!isMobile.detect()) return;
    
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
            (child as any).material.opacity = index % 2 === 0 ? 0.6 : 0.3;
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
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
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
    // Use current camera position for continuous path calculation
    const startPos = camera.position.clone();
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
        const p = curve3D.getPoint(tweenParam.t);
        camera.position.copy(p);
        if (cameraRef.current) cameraRef.current.position.copy(p);
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
    
    // Create a timeline for synchronized position and lookAt animation
    const timeline = gsap.timeline({
      onUpdate: () => {
        // Ensure both camera and cameraRef are updated
        camera.updateMatrixWorld();
        if (cameraRef.current) {
          cameraRef.current.position.copy(camera.position);
        }
        
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
          
          // Look at the correct target based on spline progress
          if (cameraStateRef.current.savedSplineProgress !== undefined && gsapLookAtTargetsRef.current) {
            // Calculate the lookAt target based on saved spline progress
            const lookAtIndex = Math.floor(cameraStateRef.current.savedSplineProgress * (gsapLookAtTargetsRef.current.length - 1));
            const lookAtTarget = gsapLookAtTargetsRef.current[Math.max(0, Math.min(lookAtIndex, gsapLookAtTargetsRef.current.length - 1))];
            camera.lookAt(lookAtTarget);
            console.log('🎯 LOOKING AT spline target:', lookAtTarget, 'at index:', lookAtIndex);
          } else if (clickedHotspot) {
            // Fallback: Look at the hotspot we just visited
            const target = new THREE.Vector3();
            clickedHotspot.getWorldPosition(target);
            camera.lookAt(target);
          }
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
    
    // Add position animation to timeline
    timeline.to(camera.position, {
      duration: 2.5,
      x: targetPosition.x,
      y: targetPosition.y,
      z: targetPosition.z,
      ease: "power2.inOut"
    }, 0); // Start at time 0
    
    // Add lookAt animation to timeline (synchronized with position)
    timeline.to(camera, {
      duration: 2.5,
      onUpdate: function() {
        // Smoothly interpolate lookAt target during animation
        const progress = this.progress();
        const currentLookAt = new THREE.Vector3();
        camera.getWorldDirection(currentLookAt);
        currentLookAt.multiplyScalar(10).add(camera.position);
        
        // Interpolate between current lookAt and target lookAt
        const interpolatedLookAt = new THREE.Vector3();
        // interpolatedLookAt.lerpVectors(currentLookAt, targetLookAt, progress);
        interpolatedLookAt.lerpVectors(currentLookAt, new THREE.Vector3(0, 0, 0), progress);
        
        camera.lookAt(interpolatedLookAt);
        camera.updateMatrixWorld();
      },
      ease: "power2.inOut"
    }, 0); // Start at time 0 (synchronized with position)
    
    console.log('🎬 TIMELINE ANIMATION STARTED: Duration 2.5s, synchronized position + lookAt');
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
    const colors = getThemeColors();
    
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
      createText('X', new THREE.Vector3(20, 0, 0), 0xff0000); // Red X-axis
      createText('Y', new THREE.Vector3(0, 20, 0), 0x00ff00); // Green Y-axis
      createText('Z', new THREE.Vector3(0, 0, 20), 0x0000ff); // Blue Z-axis
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
        createLoaderOverlay();
        updateLoaderOverlay(0, 0, null);

        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        const gltfLoader = new GLTFLoader();
        const modelUrl = `/models/ivan.glb?cb=${Date.now()}`;

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

                  // CRITICAL FIX: Collect hotspots AFTER transformations are applied
                  // This ensures hotspots have their final world positions
                  const clickableObjects: THREE.Object3D[] = [];
                  const usedColors = new Set<number>();
                  
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
                    console.log('Checking transformed object:', child.name, 'type:', child.type, 'hasMaterial:', !!child.material);
                    
                    if (child.name.includes("Hotspot")) {  // e.g. "Hotspot_Cabinet1"
                      console.log('Found transformed hotspot:', child.name, 'type:', child.type);
                      clickableObjects.push(child);
                      
                      // Ensure the hotspot has a material
                      if (!child.material) {
                        console.log('Creating material for hotspot:', child.name);
                        const colors = getThemeColors();
                        child.material = new THREE.MeshStandardMaterial({ 
                          color: colors.HOTSPOT_NORMAL_COLOR,
                          // transparent: true,
                          // opacity: 0.8  // Increased from 0.2 to 0.8 for better visibility
                        });
                      }
                      
                      // Make sure the hotspot is visible
                      child.visible = true;
                      child.frustumCulled = false;
                      
                      // Assign unique pastel color to this hotspot
                      let assignedColor: number;
                      do {
                        assignedColor = PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)];
                      } while (usedColors.has(assignedColor));
                      
                      usedColors.add(assignedColor);
                      hotspotColorsRef.current.set(child, assignedColor);
                      
                      // Set initial color to theme color
                      if (child.material) {
                        const colors = getThemeColors();
                        (child.material as THREE.MeshStandardMaterial).color.setHex(colors.HOTSPOT_NORMAL_COLOR);
                        console.log('Set initial color for', child.name, 'to theme color');
                      }
                      
                      console.log('Transformed hotspot setup complete:', child.name, 'with color:', '#' + assignedColor.toString(16).padStart(6, '0'));
                    }
                  });
                  
                  // Store hotspots for interaction
                  clickableObjectsRef.current = clickableObjects;
                  
                  // Log total hotspots found
                  console.log('Total transformed hotspots collected:', clickableObjects.length);
                  console.log('All transformed hotspots:', clickableObjects);
                  
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
    const colors = getThemeColors();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(colors.BACKGROUND_COLOR, 1);
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
      
      console.log('🎯 INTRO DEBUG SPHERES CREATED:');
      console.log('  Purple sphere (intro start):', startMarker.position);
      console.log('  Cyan sphere (intro end):', endMarker.position);
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
        console.log('Intro completed');
        
        // CRITICAL: Update journeyStartPosition to reflect where intro actually ended
        // This ensures the panel shows the correct main path position
        if (cameraStateRef.current) {
          cameraStateRef.current.journeyStartPosition.copy(INTRO_END_POS);
          cameraStateRef.current.mainPathPosition.copy(INTRO_END_POS);
          console.log('🎯 UPDATED journeyStartPosition after intro completion:', {
            journeyStartPosition: cameraStateRef.current.journeyStartPosition,
            mainPathPosition: cameraStateRef.current.mainPathPosition,
            INTRO_END_POS: INTRO_END_POS
          });
        }

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

  // Main animation loop
  const animate = (camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, scene: THREE.Scene) => {
    // Append renderer to DOM on first frame to prevent static render
    if (!renderer.domElement.parentNode) {
      mountRef.current?.appendChild(renderer.domElement);
    }
    
    // Camera position is now controlled by GSAP bezier animation
    // No need for global position monitoring that interferes with smooth movement
    
    // Don't initialize GSAP curve if we're focused on a hotspot
    if (introCompletedRef.current && !gsapPathInitializedRef.current && cameraRef.current && !isFocusedOnHotspot) {
      const startP = cameraRef.current.position.clone();
      const pts = [startP, ...gsapCameraPoints];
      gsapCurveRef.current = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1);
      const lookPts = [cubePos.current.clone(), ...gsapLookAtTargets];
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
    
    // Only run orbital/GSAP animations when NOT focused on hotspots AND not animating
    if (!isAnimatingRef.current && !isFocusedOnHotspotRef.current) {
      if (WITH_ORBITAL && (introCompletedRef.current || !WITH_INTRO)) {
        animateOrbital(camera, renderer, scene);
        // Update main path position when following orbital path
        cameraStateRef.current.mainPathPosition.copy(camera.position);
        cameraStateRef.current.isOnMainPath = true;
      } else if (introCompletedRef.current) {
        // Render GSAP scroll path when orbital is disabled
        updateCameraAlongCurve(camera, pathProgressRef.current.t);
        // Update main path position when following GSAP path
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

  useEffect(() => {
    const onScroll = () => {
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
          if (introCompletedRef.current && cameraRef.current && sceneRef.current && rendererRef.current && !isFocusedOnHotspotRef.current) {
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
        setDebugInfo((prev: any) => ({ ...(prev || {}), progress: t, progressPercent: t * 100 }));
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true } as any);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll as any);
  }, []);

  // Mouse event handlers for hotspot interaction
  useEffect(() => {
    if (!mountRef.current) return;

    // Throttle mouse move events to prevent flickering
    let throttleTimeout: any;

    const handleMouseMove = (event: MouseEvent) => {
      // 🛡️ PREVENT HOTSPOT INTERACTIONS WHEN GALLERY IS VISIBLE
      if (galleryVisibleRef.current || (window as any).__galleryMode) {
        console.log('🚫 BLOCKING MOUSEMOVE - Gallery is visible or gallery mode is active');
        console.log('  galleryVisibleRef.current:', galleryVisibleRef.current);
        console.log('  __galleryMode:', (window as any).__galleryMode);
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
      console.log('✅ MOUSEMOVE ALLOWED - Processing hotspot detection');
      
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
      
      // Add model hotspots (excluding pulse markers)
      if (clickableObjectsRef.current.length > 0) {
        const actualHotspots = clickableObjectsRef.current.filter(obj => !obj.name?.startsWith('pulse_'));
        hotspotObjects.push(...actualHotspots);
      }
      
      // Add pulse markers for cursor detection (but not for hover effects)
      if (hotspotPulseRefs.current.length > 0) {
        const pulseMarkers = hotspotPulseRefs.current.filter((_, index) => index % 2 === 0); // Only main spheres, not glow
        hotspotObjects.push(...pulseMarkers);
      }
      
      // Check for intersections
      const intersects = raycasterRef.current.intersectObjects(hotspotObjects);
      
      // Update cursor based on intersection
      if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
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
        const intersectedObject = intersects[0].object;
        if (hoveredHotspot !== intersectedObject) {
          // Reset previous hotspot (excluding pulse markers)
          if (hoveredHotspot && (hoveredHotspot as THREE.Mesh).material && !hoveredHotspot.name?.startsWith('pulse_')) {
            if (hoveredHotspot === cubeRef.current) {
              ((hoveredHotspot as THREE.Mesh).material as THREE.MeshStandardMaterial).color.setHex(CUBE_NORMAL_COLOR);
            } else {
              // Reset model hotspot to theme floor color with 80% transparency
              const colors = getThemeColors();
              ((hoveredHotspot as THREE.Mesh).material as THREE.MeshStandardMaterial).color.setHex(colors.HOTSPOT_NORMAL_COLOR);
            }
          }
          // Set new hotspot
          setHoveredHotspot(intersectedObject);
          
          // Show category tooltip
          const category = HOTSPOT_CATEGORIES[intersectedObject.name] || 'Unknown';
          setHoverTooltip({
            visible: true,
            text: category,
            position: { x: event.clientX, y: event.clientY }
          });
          
          if ((intersectedObject as THREE.Mesh).material) {
            if (intersectedObject === cubeRef.current) {
              // Highlight cube in red
              ((intersectedObject as THREE.Mesh).material as THREE.MeshStandardMaterial).color.setHex(CUBE_HIGHLIGHT_COLOR);
              console.log('Changed cube color to red!');
            } else {
              // Highlight model hotspot with its assigned random pastel color
              const assignedColor = hotspotColorsRef.current.get(intersectedObject);
              if (assignedColor) {
                ((intersectedObject as THREE.Mesh).material as THREE.MeshStandardMaterial).color.setHex(assignedColor);
              } else {
                // Fallback to bright green if no color assigned
                ((intersectedObject as THREE.Mesh).material as THREE.MeshStandardMaterial).color.setHex(0x00ff00);
              }
            }
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
            const colors = getThemeColors();
            ((hoveredHotspot as THREE.Mesh).material as THREE.MeshStandardMaterial).color.setHex(colors.HOTSPOT_NORMAL_COLOR);
          }
        }
        setHoveredHotspot(null);
        
        // Hide tooltip when no intersection
        setHoverTooltip((prev: any) => ({ ...prev, visible: false }));
      }
      
      // Always ensure pulse markers are visible after any mouse movement (mobile only)
      if (isMobile.detect() && hotspotPulseRefs.current.length > 0) {
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
        const intersectedObject = intersects[0].object;
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
        const clickedObject = intersects[0].object;
        const intersection = intersects[0];
        
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

    // Add event listeners with throttled mouse move to prevent flickering
    const throttledMouseMove = (event: MouseEvent) => {
      if (throttleTimeout) return;
      throttleTimeout = setTimeout(() => {
        handleMouseMove(event);
        throttleTimeout = null as any;
      }, 16); // 60fps throttle
    };
    
    // Store references to original listeners for gallery mode management
    (window as any).__originalMouseMoveListener = throttledMouseMove;
    (window as any).__originalClickListener = handleClick;
    
    window.addEventListener('mousemove', throttledMouseMove);
    window.addEventListener('click', handleClick);

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', throttledMouseMove);
      window.removeEventListener('click', handleClick);
      // Clean up stored references
      delete (window as any).__originalMouseMoveListener;
      delete (window as any).__originalClickListener;
      // Clean up pulse animation and markers
      stopPulseAnimation();
      cleanupPulseMarkers();
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
          </div>
        </div>
      )}

      {/* Debug Toggle Checkbox */}
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
          className="fixed z-50 px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg shadow-lg transition-all duration-300 ease-out"
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
    </>
  );
} 