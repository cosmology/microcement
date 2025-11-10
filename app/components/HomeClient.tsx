"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react"
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import HeroSection from "./HeroSection"
import Preloader from "./Preloader"
import BeforeAndAfterSection from "./BeforeAndAfterSection"
import EnvironmentalSection from "./EnvironmentalSection"
import ComparisonSection from "./ComparisonSection"
import GallerySection from "./GallerySection"
import FeaturedShowcase from "./FeaturedShowcase"
import TextureSamples from "./TextureSamples"
import LuxurySection from "./LuxurySection"
import SpeedSection from "./SpeedSection"
import BenefitsSection from "./BenefitsSection"
import CTASection from "./CTASection"
import NavigationSection from "./NavigationSection"
import UserProfile from "./UserProfile"
import AuthHandler from "./AuthHandler"
// import NoDesignAvailable from "./NoDesignAvailable" // Now defined locally
import dynamic from "next/dynamic";
import DebugInfo from "./DebugInfo";
import ScrollDownCTA from "./ScrollDownCTA";
import { getThemeColors } from "@/lib/utils";
import { SceneConfigService } from '@/lib/services/SceneConfigService';
import { supabase } from '@/lib/supabase';
import { SCENE_CONFIG } from '@/lib/config/sceneConfig';
import TimelineWaypoints from "./TimelineWaypoints";
import DockedNavigation from "./DockedNavigation";
import { useUserRole, UserRole } from "@/hooks/useUserRole";
import { useSceneStore } from "@/lib/stores/sceneStore";

// Import SceneEditor directly - uses Zustand stores, no event bridge needed
const SceneEditorDynamic = dynamic(() => import("./SceneEditor"), {
  ssr: false,
});
const disableSceneStatic = process.env.NEXT_PUBLIC_DISABLE_SCENE === '1';

export default function HomeClient() {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false)
  const [preloadDone, setPreloadDone] = useState(false)
  const [sceneStage, setSceneStage] = useState(0);
  const [currentSection, setCurrentSection] = useState<string>('hero');
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [debugData, setDebugData] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [hasUserConfig, setHasUserConfig] = useState<boolean | null>(null);
  const [configCheckComplete, setConfigCheckComplete] = useState(false);
  const [sceneDisabled, setSceneDisabled] = useState(() => {
    if (disableSceneStatic) {
      return true;
    }
    if (typeof window === 'undefined') {
      return true;
    }
    return (window as any).__DISABLE_SCENE__ === true;
  });
  const showSceneEditor = !sceneDisabled;
  const t = useTranslations('Index');
  const tMarker = useTranslations('MarkerPanels');
  
  // Get user role information
  const { user: userWithRole, role, profile, loading: userRoleLoading } = useUserRole();
  
  // Scene store for iOS export loading
  const { setModelPath, setRoomPlanJsonPath, setRoomPlanMetadata } = useSceneStore();

  // Section refs
  const hero = useRef<HTMLDivElement>(null);
  const env = useRef<HTMLDivElement>(null);
  const benefits = useRef<HTMLDivElement>(null);
  const speed = useRef<HTMLDivElement>(null);
  const luxury = useRef<HTMLDivElement>(null);
  const comparison = useRef<HTMLDivElement>(null);
  const gallery = useRef<HTMLDivElement>(null);
  const beforeAfter = useRef<HTMLDivElement>(null);
  const featured = useRef<HTMLDivElement>(null);
  const texture = useRef<HTMLDivElement>(null);
  const cta = useRef<HTMLDivElement>(null);

  // Sign out function
  const handleSignOut = async () => {
    try {
      console.log('🔍 HomeClient: Sign out initiated');
      await supabase.auth.signOut();
      console.log('🔍 HomeClient: Supabase sign out completed');
      setUser(null);
      setHasUserConfig(null);
      setConfigCheckComplete(false);
      console.log('🔍 HomeClient: User state reset to null');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  useEffect(() => {
    setMounted(true)
    if (disableSceneStatic) {
      setSceneDisabled(true)
      return
    }
    if (typeof window !== 'undefined') {
      setSceneDisabled((window as any).__DISABLE_SCENE__ === true)
    } else {
      setSceneDisabled(false)
    }
  }, [])

  // Handle iOS export URL parameters
  useEffect(() => {
    console.log('🔍 [HomeClient] Checking iOS export URL params...');
    console.log('🔍 [HomeClient] mounted:', mounted);
    console.log('🔍 [HomeClient] searchParams:', searchParams);
    console.log('🔍 [HomeClient] current URL:', typeof window !== 'undefined' ? window.location.href : 'N/A');
    
    if (!mounted) {
      console.log('⚠️ [HomeClient] Not mounted yet, waiting...');
      return;
    }
    
    // Try to get params from useSearchParams first, fallback to URLSearchParams
    const params = searchParams || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null);
    
    if (!params) {
      console.log('⚠️ [HomeClient] No search params available');
      return;
    }
    
    const exportId = params.get('exportId');
    const userId = params.get('userId');
    
    console.log('🔍 [HomeClient] exportId:', exportId);
    console.log('🔍 [HomeClient] userId:', userId);
    
    if (exportId && userId) {
      console.log('✅ [HomeClient] Starting iOS export load for exportId:', exportId, 'userId:', userId);
      // Fetch export data and load directly into scene
      const loadIOSExport = async () => {
        try {
          console.log('📡 [HomeClient] Fetching export data from /api/exports/' + exportId);
          const response = await fetch(`/api/exports/${exportId}`);
          if (response.ok) {
            const exportData = await response.json();
            console.log('✅ [HomeClient] Export data received:', exportData);
            console.log('📊 [HomeClient] Export status:', exportData.status);
            console.log('📊 [HomeClient] Export GLB path:', exportData.glb_path);
            
            if (exportData.status === 'ready' && exportData.glb_path) {
              console.log('✅ [HomeClient] Export is ready, saving to Zustand store');
              
              // Save model path to store - SceneEditor will watch this and load automatically
              setModelPath(exportData.glb_path);
              console.log('✅ [HomeClient] Set modelPath in store:', exportData.glb_path);
              
              // Save JSON path to store
              if (exportData.json_path) {
                setRoomPlanJsonPath(exportData.json_path);
                console.log('✅ [HomeClient] Set roomPlanJsonPath in store:', exportData.json_path);
                
                // Load and save JSON metadata
                try {
                  const jsonResponse = await fetch(exportData.json_path);
                  if (jsonResponse.ok) {
                    const roomPlanJson = await jsonResponse.json();
                    setRoomPlanMetadata(roomPlanJson);
                    console.log('✅ [HomeClient] Loaded and saved roomPlanMetadata to store');
                  } else {
                    console.warn('⚠️ [HomeClient] Failed to load JSON metadata:', jsonResponse.status);
                  }
                } catch (jsonError) {
                  console.error('❌ [HomeClient] Error loading JSON metadata:', jsonError);
                }
              } else {
                console.log('ℹ️ [HomeClient] No JSON path available for this export');
              }
              
              // Clear URL params after saving to store
              window.history.replaceState({}, '', window.location.pathname);
              console.log('✅ [HomeClient] iOS export data saved to store, SceneEditor will load automatically');
            } else {
              console.warn('⚠️ [HomeClient] Export not ready or missing GLB path');
            }
          } else {
            console.error('❌ [HomeClient] Failed to fetch export data:', response.status, response.statusText);
          }
        } catch (error) {
          console.error('❌ [HomeClient] Failed to load iOS export:', error);
        }
      };
      
      loadIOSExport();
    } else {
      console.log('⚠️ [HomeClient] Missing exportId or userId, skipping iOS export load');
    }
  }, [mounted, searchParams]);

  // Check if user has scene configurations
  // Function to check user configs (moved outside useEffect for reuse)
  const checkUserConfigs = async (forceClearCache = false) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [HomeClient] Checking user configs for:', user?.email, 'Role:', role);
    }
    
    if (user?.id) {
      try {
        // CRITICAL: NO auto-load for any user role
        // All users (end_user, architect, admin) should start with blank scene
        // Models should only load when explicitly selected from panels
        console.log('🚫 [HomeClient] Skipping auto-load - all users start with blank scene');
        console.log('🚫 [HomeClient] User role:', role, '- Models load only on explicit selection');
        setHasUserConfig(false); // Force blank scene for everyone
        setConfigCheckComplete(true);
        return;
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to check user configs:', error);
        }
        setHasUserConfig(false);
      }
    } else {
      setHasUserConfig(null);
    }
    
    setConfigCheckComplete(true);
  };

  // Check user configs when user changes (with proper dependency)
  const userIdRef = useRef<string | null>(null);
  const prevRoleRef = useRef<UserRole | null>(null);
  
  useEffect(() => {
    // Prevent infinite loop by only running when user ID or role actually changes
    const userIdChanged = userIdRef.current !== user?.id;
    const roleChanged = prevRoleRef.current !== role;
    
    if (!userIdChanged && !roleChanged) {
      return;
    }
    
    userIdRef.current = user?.id || null;
    prevRoleRef.current = role;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 HomeClient: User ID changed:', user?.id, 'Role:', role);
    }
    checkUserConfigs();
  }, [user?.id, role]); // Depend on both user.id and role

  // Listen for user config refresh events (e.g., after upload)
  useEffect(() => {
    const handleUserConfigRefresh = async (event: any) => {
      console.log('🔄 [HomeClient] User config refresh event received, re-checking configs...')
      await checkUserConfigs(true) // Force clear cache
      
      // After configs are refreshed, trigger a delayed check to load the model
      // This gives React time to re-render with the new hasUserConfig state
      setTimeout(() => {
        if (event.detail?.sceneConfigId) {
          console.log('🔄 [HomeClient] Configs refreshed, waiting for SceneEditor to render...')
          
          // Wait for SceneEditor to be rendered and ready
          const checkAndLoad = setInterval(() => {
            if ((window as any).sceneEditorCamera && (window as any).sceneEditorRenderer && (window as any).sceneEditorScene) {
              console.log('🔄 [HomeClient] SceneEditor is ready, dispatching load event...')
              clearInterval(checkAndLoad)
              
              // Dispatch the load event now that SceneEditor is ready
              window.dispatchEvent(new CustomEvent('reload-current-model', {
                detail: { sceneConfigId: event.detail.sceneConfigId }
              }))
              console.log('🔄 [HomeClient] Reload current model event dispatched')
            }
          }, 100)
          
          // Timeout after 5 seconds
          setTimeout(() => clearInterval(checkAndLoad), 5000)
        }
      }, 1000) // Wait 1 second for React to re-render
    }

    window.addEventListener('user-config-refresh', handleUserConfigRefresh)
    
    return () => {
      window.removeEventListener('user-config-refresh', handleUserConfigRefresh)
    }
  }, [user]); // Include user dependency to ensure checkUserConfigs has access to current user

  // Mobile scroll fallback - ensure scrolling works on mobile devices
  useEffect(() => {
    if (!preloadDone) return

    // Check if we're on mobile and intro hasn't completed after 3 seconds
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    if (isMobileDevice) {
      const fallbackTimer = setTimeout(() => {
        if (!scrollEnabled) {
          console.log('📱 Mobile scroll fallback: Enabling scroll after timeout')
          setScrollEnabled(true)
        }
        
        // Force restore scrolling CSS properties
        document.body.style.overflow = 'auto'
        document.body.style.touchAction = 'pan-y'
        document.documentElement.style.overflow = 'auto'
        document.documentElement.style.touchAction = 'pan-y'
        
        console.log('📱 Mobile scroll fallback: Forced CSS scroll restoration')
      }, 3000) // 3 second fallback

      return () => clearTimeout(fallbackTimer)
    }
  }, [preloadDone, scrollEnabled])

  // Aggressive scroll restoration - ensure scrolling always works (but respect gallery mode)
  useEffect(() => {
    if (!preloadDone) return

    const forceScrollRestore = () => {
      // Force enable scrolling every 2 seconds if it's blocked UNLESS gallery is open
      const interval = setInterval(() => {
        // Don't restore scroll if gallery is open
        const isGalleryOpen = (window as any).__galleryMode === true
        
        if (!isGalleryOpen && (document.body.style.overflow === 'hidden' || document.body.style.touchAction === 'none')) {
          console.log('🔧 Force restoring scroll - CSS was blocked (no gallery open)')
          document.body.style.overflow = 'auto'
          document.body.style.touchAction = 'pan-y'
          document.documentElement.style.overflow = 'auto'
          document.documentElement.style.touchAction = 'pan-y'
        }
      }, 2000)

      return () => clearInterval(interval)
    }

    const cleanup = forceScrollRestore()
    return cleanup
  }, [preloadDone])

  // Touch scroll detection - enable scrolling when user tries to scroll
  useEffect(() => {
    if (!preloadDone) return

    const handleTouchStart = (e: TouchEvent) => {
      // If scrolling is blocked, force enable it when user tries to scroll
      if (document.body.style.overflow === 'hidden' || document.body.style.touchAction === 'none') {
        console.log('👆 Touch detected - forcing scroll enable')
        document.body.style.overflow = 'auto'
        document.body.style.touchAction = 'pan-y'
        document.documentElement.style.overflow = 'auto'
        document.documentElement.style.touchAction = 'pan-y'
        setScrollEnabled(true)
      }
    }

    const handleWheel = (e: WheelEvent) => {
      // If scrolling is blocked, force enable it when user tries to scroll
      if (document.body.style.overflow === 'hidden' || document.body.style.touchAction === 'none') {
        console.log('🖱️ Wheel detected - forcing scroll enable')
        document.body.style.overflow = 'auto'
        document.body.style.touchAction = 'pan-y'
        document.documentElement.style.overflow = 'auto'
        document.documentElement.style.touchAction = 'pan-y'
        setScrollEnabled(true)
      }
    }

    // Add event listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('wheel', handleWheel, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('wheel', handleWheel)
    }
  }, [preloadDone])

  // Follow path selection handler
  useEffect(() => {
    const handleFollowPathSelect = (e: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[HomeClient] Follow path selected:', e.detail);
      }
      
      // Trigger scene reload with new camera path
      if (e.detail && e.detail.cameraPoints) {
        // Dispatch a scene reload event with the new camera data
        window.dispatchEvent(new CustomEvent('scene-reload-camera', {
          detail: {
            cameraPoints: e.detail.cameraPoints,
            lookAtTargets: e.detail.lookAtTargets,
            pathName: e.detail.id,
            pathId: e.detail.pathId
          }
        }));
      }
    };

    window.addEventListener('follow-path-select', handleFollowPathSelect);

    return () => {
      window.removeEventListener('follow-path-select', handleFollowPathSelect);
    };
  }, []);

  // Intersection Observer for section detection
  useEffect(() => {
    if (!preloadDone) return;
    const heroElement = hero.current;
    const envElement = env.current;
    const comparisonElement = comparison.current;
    const speedElement = speed.current;
    const galleryElement = gallery.current;
    const beforeAfterElement = beforeAfter.current;
    const featuredElement = featured.current;
    const textureElement = texture.current;
    const luxuryElement = luxury.current;
    const benefitsElement = benefits.current;
    const ctaElement = cta.current;
    
    if (!heroElement || !envElement || !comparisonElement || !speedElement || !galleryElement || !beforeAfterElement || !featuredElement || !textureElement || !luxuryElement || !benefitsElement || !ctaElement) return;

    // Debug: Check if speed ref is properly set
    console.log('🔍 Speed ref check:', {
      speedElement: speedElement,
      speedElementCurrent: speed.current,
      speedElementTag: speedElement?.tagName,
      speedElementClasses: speedElement?.className
    });

    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      let stage = 0;
      console.log('🔍 Intersection entries:', entries.length);
      
      entries.forEach(entry => {
        // Skip hero section entirely
        if (entry.target === heroElement) {
          console.log('🔍 Skipping hero section');
          return;
        }
        
        console.log('🔍 Entry:', {
          target: entry.target,
          isIntersecting: entry.isIntersecting,
          intersectionRatio: entry.intersectionRatio,
          isSpeed: entry.target === speedElement,
          isGallery: entry.target === galleryElement
        });
        
        if (entry.isIntersecting) {
          
          if (entry.target === envElement) {
            console.log('🎯 Section entered: ENVIRONMENTAL');
            setCurrentSection('environmental');
          } else if (entry.target === comparisonElement) {
            console.log('🎯 Section entered: COMPARISON');
            setCurrentSection('comparison');
          } else if (entry.target === speedElement) {
            console.log('🎯 Section entered: SPEED');
            setCurrentSection('speed');
            stage = 1; // Only set stage to 1 for speed section
          } else if (entry.target === galleryElement) {
            console.log('🎯 Section entered: GALLERY');
            setCurrentSection('gallery');
          } else if (entry.target === beforeAfterElement) {
            console.log('🎯 Section entered: BEFORE & AFTER');
            setCurrentSection('before-after');
          } else if (entry.target === featuredElement) {
            console.log('🎯 Section entered: FEATURED');
            setCurrentSection('featured');
          } else if (entry.target === textureElement) {
            console.log('🎯 Section entered: TEXTURE');
            setCurrentSection('texture');
          } else if (entry.target === luxuryElement) {
            console.log('🎯 Section entered: LUXURY');
            setCurrentSection('luxury');
          } else if (entry.target === benefitsElement) {
            console.log('🎯 Section entered: BENEFITS');
            setCurrentSection('benefits');
          } else if (entry.target === ctaElement) {
            console.log('🎯 Section entered: CTA');
            setCurrentSection('cta');
          }
        }
      });
      
      setSceneStage(stage);
    };

    const observer = new IntersectionObserver(handleIntersect, {
      threshold: 0.3,
      rootMargin: '0px 0px -10% 0px'
    });

    // observer.observe(hero); // Removed hero from observation
    observer.observe(envElement);
    observer.observe(comparisonElement);
    observer.observe(speedElement);
    observer.observe(galleryElement);
    observer.observe(beforeAfterElement);
    observer.observe(featuredElement);
    observer.observe(textureElement);
    observer.observe(luxuryElement);
    observer.observe(benefitsElement);
    observer.observe(ctaElement);
    
    return () => observer.disconnect();
  }, [preloadDone]);

  // Function to show marker panel on hover (for 3D marker interaction)
  const showMarkerPanel = (markerIndex: number) => {
    const panel = document.querySelector(`[data-marker-index="${markerIndex}"]`) as HTMLElement;
    if (panel) {
      // Only show if we're in the scroll range for this panel
      const start = parseFloat(panel.dataset.progressStart || '0');
      const end = parseFloat(panel.dataset.progressEnd || '0');
      
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      
      if (scrollPercent >= start && scrollPercent <= end) {
        // Only enhance visibility if we're in scroll range
        panel.style.opacity = '1';
        panel.style.pointerEvents = 'auto';
        console.log(`🎯 Showing panel for marker ${markerIndex} (in scroll range)`);
      }
    }
  };

  // Function to hide all marker panels (let GSAP handle scroll-based visibility)
  const hideAllMarkerPanels = () => {
    const panels = document.querySelectorAll('[data-marker-index]') as NodeListOf<HTMLElement>;
    
    panels.forEach(panel => {
      // Only hide if not in scroll range
      const start = parseFloat(panel.dataset.progressStart || '0');
      const end = parseFloat(panel.dataset.progressEnd || '0');
      
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      
      if (!(scrollPercent >= start && scrollPercent <= end)) {
        panel.style.opacity = '0';
        panel.style.pointerEvents = 'none';
      }
    });
  };

  // Expose functions to window for ScrollScene to use
  useEffect(() => {
    (window as any).showMarkerPanel = showMarkerPanel;
    (window as any).hideAllMarkerPanels = hideAllMarkerPanels;
    
    return () => {
      delete (window as any).showMarkerPanel;
      delete (window as any).hideAllMarkerPanels;
    };
  }, []);

  // GSAP ScrollTrigger for marker panels
  useEffect(() => {
    if (!preloadDone) return;
    if (!user || !configCheckComplete || hasUserConfig !== true) return;
    
    const initScrollTrigger = async () => {
      // Wait a bit for DOM to be fully rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      const gsap = (await import('gsap')).default;
      
      gsap.registerPlugin(ScrollTrigger);

      // Panel Animation: Static background, text slides in/out
      const panelNodes = Array.from(document.querySelectorAll('[data-marker-index]')) as HTMLElement[];
      console.log('🔍 Found Panels:', panelNodes.length);
      
      if (panelNodes.length === 0) {
        console.error('❌ No marker panels found! Check if panels are rendered.');
        return;
      }
      
      // Sort panels by their start percentage
      const sortedPanels = panelNodes.sort((a, b) => {
        const startA = parseFloat(a.dataset.progressStart || '0');
        const startB = parseFloat(b.dataset.progressStart || '0');
        return startA - startB;
      });

      sortedPanels.forEach((panel, index) => {
        const start = parseFloat(panel.dataset.progressStart || '0');
        const end = parseFloat(panel.dataset.progressEnd || '0');
        const name = panel.dataset.markerName || '';

        // Find text content elements within the panel
        const headerElement = panel.querySelector('h3');
        const contentElement = panel.querySelector('p');

        if (index === 0) {
          // Floor panel: slide up from bottom with fade-in
          console.log(`🔧 Setting up Floor panel (${name}): range ${start}-${end}%`);
          gsap.set(panel, { 
            y: '100%', // Start off-screen bottom
            opacity: 0
          });

          ScrollTrigger.create({
            trigger: 'body',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1,
            onUpdate: () => {
              const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
              const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
              const scrollPercent = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;

              // Debug all panels
              if (scrollPercent > 0) {
                // console.log(`🔍 Panel ${index} (${name}): scrollPercent=${scrollPercent.toFixed(1)}%, range=${start}-${end}%`);
              }

              if (scrollPercent < start) {
                // Before start: hidden off-screen bottom
                gsap.set(panel, { 
                  y: '100%', 
                  opacity: 0
                });
                return;
              }

              if (scrollPercent >= start && scrollPercent <= end) {
                // During range: slide up from bottom with fade-in
                const range = Math.max(1e-6, end - start);
                const slideProgress = (scrollPercent - start) / range; // 0 → 1
                
                gsap.set(panel, { 
                  y: `${100 - (slideProgress * 100)}%`, // 100% → 0%
                  opacity: slideProgress // 0 → 1
                });
                
                // Debug when panel is shown
                if (slideProgress > 0.1) {
                  // console.log(`✅ Floor panel showing: slideProgress=${slideProgress.toFixed(2)}, opacity=${slideProgress}`);
                }
                return;
              }

              if (scrollPercent > end) {
                // After end: slide out to left
                gsap.set(panel, { 
                  y: '0px',
                  opacity: 0
                });
                return;
              }
            }
          });
        } else {
          // Other panels: static background, text slides in/out
          gsap.set(panel, { 
            y: '0px', // Stay at bottom
            opacity: 0 // Start hidden
          });

          // Initialize text content off-screen right
          if (headerElement) gsap.set(headerElement, { x: '40px', opacity: 0 });
          if (contentElement) gsap.set(contentElement, { x: '40px', opacity: 0 });

          ScrollTrigger.create({
            trigger: 'body',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1,
            onUpdate: () => {
              const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
              const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
              const scrollPercent = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;

              // Debug all panels
              if (scrollPercent > 0) {
                // console.log(`🔍 Panel ${index} (${name}): scrollPercent=${scrollPercent.toFixed(1)}%, range=${start}-${end}%`);
              }

              if (scrollPercent >= start && scrollPercent <= end) {
                // During range: show panel and slide text in from right
                const range = Math.max(1e-6, end - start);
                const slideProgress = (scrollPercent - start) / range; // 0 → 1
                
                // Show the panel background
                gsap.set(panel, { 
                  y: '0px',
                  opacity: 1
                });
                
                if (headerElement) {
                  gsap.set(headerElement, { 
                    x: `${40 - (slideProgress * 40)}px`, // 40px → 0px
                    opacity: slideProgress // 0 → 1
                  });
                }
                if (contentElement) {
                  gsap.set(contentElement, { 
                    x: `${40 - (slideProgress * 40)}px`, // 40px → 0px
                    opacity: slideProgress // 0 → 1
                  });
                }
                return;
              }

              if (scrollPercent > end) {
                // After end: slide text out to left and hide panel
                if (headerElement) {
                  gsap.set(headerElement, { 
                    x: '-40px',
                    opacity: 0
                  });
                }
                if (contentElement) {
                  gsap.set(contentElement, { 
                    x: '-40px',
                    opacity: 0
                  });
                }
                
                // Hide the panel background
                gsap.set(panel, { 
                  y: '0px',
                  opacity: 0
                });
                return;
              }

              // Before start: hide panel and text off-screen right
              gsap.set(panel, { 
                y: '0px',
                opacity: 0
              });
              
              if (headerElement) {
                gsap.set(headerElement, { 
                  x: '40px',
                  opacity: 0
                });
              }
              if (contentElement) {
                gsap.set(contentElement, { 
                  x: '40px',
                  opacity: 0
                });
              }
            }
          });
        }
      });
    };

    initScrollTrigger();

    return () => {
      // Cleanup ScrollTrigger instances
      if (typeof window !== 'undefined' && (window as any).ScrollTrigger) {
        (window as any).ScrollTrigger.getAll().forEach((trigger: any) => trigger.kill());
      }
    };
  }, [preloadDone, user, configCheckComplete, hasUserConfig]);

  if (!mounted) return null

  // Role-based content rendering
  const renderContent = () => {
    if (userRoleLoading) {
      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white dark:bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t('loadingUserProfile')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {t('pleaseWaitAccountInfo')}
            </p>
          </div>
        </div>
      )
    }

    switch (role) {
      case 'guest':
        return renderGuestContent()
      case 'end_user':
        return renderEndUserContent()
      case 'architect':
      case 'admin':
        return renderArchitectContent()
      default:
        return null
    }
  }

  const renderGuestContent = () => (
    <>
      <NavigationSection user={user} onUserChange={setUser} role={role} loading={userRoleLoading} />
      <main 
        className="relative z-20"
        style={{ 
          visibility: preloadDone ? 'visible' : 'hidden'
        }}
      >
        <div id="hero" ref={hero} className="min-h-screen">
          <HeroSection />
        </div>
        <div id="environmental" ref={env} className="min-h-screen">
          <EnvironmentalSection />
        </div>
        <div id="comparison" ref={comparison} className="min-h-screen opacity-90">
          <ComparisonSection />
        </div>
        <div id="speed" ref={speed} className="min-h-screen opacity-90">
          <SpeedSection />
        </div>
        <div id="gallery" ref={gallery} className="min-h-screen opacity-90">
          <GallerySection />
        </div>
        <div id="before-after" ref={beforeAfter} className="min-h-screen opacity-90">
          <BeforeAndAfterSection />
        </div>
        <div id="featured" ref={featured} className="min-h-screen opacity-90">
          <FeaturedShowcase />
        </div>
        <div id="textures" ref={texture} className="min-h-screen opacity-90">
          <TextureSamples />
        </div>
        <div id="luxury" ref={luxury} className="min-h-screen opacity-90">
          <LuxurySection />
        </div>
        <div id="benefits" ref={benefits} className="min-h-screen opacity-90">
          <BenefitsSection />
        </div>
        <div id="cta" ref={cta} className="min-h-screen">
          <CTASection />
        </div>
      </main>
      
      {/* ScrollDownCTA for guest users */}
      <ScrollDownCTA />
    </>
  )

  const renderEndUserContent = () => (
    <>
      <DockedNavigation role={role} userWithRole={userWithRole} />
      <div className="ml-12 md:ml-48">
        <NavigationSection user={user} onUserChange={setUser} role={role} loading={userRoleLoading} />
      </div>
      
      {/* END USERS: Always render SceneEditor (but don't auto-load models) */}
      {/* This ensures event listeners are registered for loading selected projects */}
      {configCheckComplete && showSceneEditor && (
        <>
          <SceneEditorDynamic 
            sceneStage={sceneStage} 
            currentSection={currentSection}
            user={user}
            userRole={role}
            onIntroComplete={() => {
              setScrollEnabled(true);
              window.dispatchEvent(new CustomEvent('introComplete'));
              setTimeout(() => {
                if ((window as any).__scrollDownCTAIntroComplete) {
                  (window as any).__scrollDownCTAIntroComplete();
                }
              }, 100);
            }}
            onIntroStart={() => setScrollEnabled(false)}
            onDebugUpdate={setDebugData}
          />
          {debugData && <DebugInfo {...debugData} />}
          <TimelineWaypoints />
          <ScrollDownCTA />
          {/* Virtual scroll sections (no content) to drive scroll-based progression */}
          <main className="relative z-10" style={{ visibility: preloadDone ? 'visible' : 'hidden' }}>
            <div className="min-h-screen" />
            {SCENE_CONFIG.MARKER_PANELS.map((marker, idx) => (
              <div key={`vs-end-${idx}`} className="h-screen" data-marker-index={idx} data-progress-start={marker.progress.split('-')[0].replace('%','')} data-progress-end={marker.progress.split('-')[1].replace('%','')}></div>
            ))}
          </main>
        </>
      )}
    </>
  )

  const renderArchitectContent = () => (
    <>
      <DockedNavigation role={role} userWithRole={userWithRole} />
      <div className="ml-12 md:ml-48">
        <NavigationSection user={user} onUserChange={setUser} role={role} loading={userRoleLoading} />
      </div>
      
      {/* ARCHITECTS: Always render SceneEditor (but don't auto-load own models) */}
      {/* This ensures event listeners are registered for loading client projects */}
      {configCheckComplete && showSceneEditor && (
        <>
          <SceneEditorDynamic 
            sceneStage={sceneStage} 
            currentSection={currentSection}
            user={user}
            userRole={role}
            onIntroComplete={() => {
              setScrollEnabled(true);
              window.dispatchEvent(new CustomEvent('introComplete'));
              setTimeout(() => {
                if ((window as any).__scrollDownCTAIntroComplete) {
                  (window as any).__scrollDownCTAIntroComplete();
                }
              }, 100);
            }}
            onIntroStart={() => setScrollEnabled(false)}
            onDebugUpdate={setDebugData}
          />
          {debugData && <DebugInfo {...debugData} />}
          <TimelineWaypoints />
          <ScrollDownCTA />
          {/* Virtual scroll sections (no content) to drive scroll-based progression */}
          <main className="relative z-10" style={{ visibility: preloadDone ? 'visible' : 'hidden' }}>
            <div className="min-h-screen" />
            {SCENE_CONFIG.MARKER_PANELS.map((marker, idx) => (
              <div key={`vs-arch-${idx}`} className="h-screen" data-marker-index={idx} data-progress-start={marker.progress.split('-')[0].replace('%','')} data-progress-end={marker.progress.split('-')[1].replace('%','')}></div>
            ))}
          </main>
        </>
      )}
    </>
  )

  return (
      <div className="relative">
        <AuthHandler onUserChange={setUser} />
        
        {/* Preloader */}
        {!preloadDone && (
          <Preloader onComplete={() => setPreloadDone(true)} />
        )}
        
        {preloadDone && renderContent()}
        
        {/* Login Modal */}
        {showLoginModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <UserProfile 
                forceShowAuth={true}
                onUserChange={(user) => {
                  setUser(user);
                  if (user) {
                    setShowLoginModal(false);
                  }
                }} 
              />
            </div>
          </div>
        )}
      </div>
  )

  // handleSignOut already defined above
}

function NoDesignAvailable({ onLoginClick, onSignOutClick, isLoggedIn }: { 
  onLoginClick: () => void, 
  onSignOutClick: () => void 
    isLoggedIn: boolean 
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
      <div className="text-center max-w-md mx-auto p-6">
        {/* Logo - 200px width, centered, toned down like DockedNavigation borders */}
        <div className="mb-8 flex justify-center">
          <div className="relative" style={{ width: '200px' }}>
            <img
              src="/images/logo-procemento.png"
              alt="ProCemento Logo"
              className="w-full h-auto object-contain opacity-30 dark:opacity-20"
            />
          </div>
        </div>

        {/* Main Message - Subtle */}
        <p className="text-sm mb-8 text-gray-600 dark:text-gray-400 font-light">
          {isLoggedIn 
            ? 'You don\'t have any project designs yet. Contact your architect to get started.'
            : 'Please log in to access your personalized design experience.'
          }
        </p>

        {/* Action Buttons - Match DockedNavigation role badge background */}
        <div className="space-y-3">
          {isLoggedIn ? (
            <button
              onClick={onSignOutClick}
              className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium py-2 px-6 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
            >
              Sign Out
            </button>
          ) : (
            <button
              onClick={onLoginClick}
              className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium py-2 px-6 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
            >
              Log In
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
