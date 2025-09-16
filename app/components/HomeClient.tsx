"use client";

import { useEffect, useRef, useState } from "react"
import { useTranslations } from 'next-intl';
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
import dynamic from "next/dynamic";
import DebugInfo from "./DebugInfo";
import ScrollDownCTA from "./ScrollDownCTA";
import { getThemeColors } from "@/lib/utils";

const ScrollScene = dynamic(() => import("./ScrollScene"), { ssr: false });

export default function HomeClient() {
  const [mounted, setMounted] = useState(false)
  const [preloadDone, setPreloadDone] = useState(false)
  const [sceneStage, setSceneStage] = useState(0);
  const [currentSection, setCurrentSection] = useState<string>('hero');
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [debugData, setDebugData] = useState<any>(null);
  const t = useTranslations('Index');
  const tMarker = useTranslations('MarkerPanels');

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

  useEffect(() => {
    setMounted(true)
  }, [])


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

  // Aggressive scroll restoration - ensure scrolling always works
  useEffect(() => {
    if (!preloadDone) return

    const forceScrollRestore = () => {
      // Force enable scrolling every 2 seconds if it's blocked
      const interval = setInterval(() => {
        if (document.body.style.overflow === 'hidden' || document.body.style.touchAction === 'none') {
          console.log('🔧 Force restoring scroll - CSS was blocked')
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

  // GSAP ScrollTrigger for marker panels
  useEffect(() => {
    if (!preloadDone) return;

    // Import GSAP ScrollTrigger dynamically
    const initScrollTrigger = async () => {
      // Wait a bit for DOM to be fully rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      const gsap = (await import('gsap')).default;
      
      gsap.registerPlugin(ScrollTrigger);

      // Panel Animation: Static background, text slides in/out
      const panelNodes = Array.from(document.querySelectorAll('[data-marker-index]')) as HTMLElement[];
      console.log('🔍 Found Panels:', panelNodes.length);
      
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
  }, [preloadDone]);

  if (!mounted) return null

    return (
    <div className="relative">
 
      {/* {!preloadDone && <Preloader onComplete={() => setPreloadDone(true)} />} */}
      <NavigationSection />
      <ScrollScene 
        sceneStage={sceneStage} 
        currentSection={currentSection}
        onIntroComplete={() => {
          console.log('🎯 HomeClient: Intro completed, enabling scroll and triggering ScrollDownCTA');
          setScrollEnabled(true);
          
          // Dispatch custom event for ContentProgress
          window.dispatchEvent(new CustomEvent('introComplete'));
          
          // Trigger ScrollDownCTA intro completion with retry mechanism
          const triggerScrollDownCTA = () => {
            if ((window as any).__scrollDownCTAIntroComplete) {
              console.log('🎯 HomeClient: Calling ScrollDownCTA intro complete handler');
              (window as any).__scrollDownCTAIntroComplete();
            } else {
              console.log('🎯 HomeClient: ScrollDownCTA handler not found, retrying in 100ms');
              setTimeout(triggerScrollDownCTA, 100);
            }
          };
          
          triggerScrollDownCTA();
        }}
        onIntroStart={() => setScrollEnabled(false)}
        onDebugUpdate={setDebugData}
      />
      {debugData && <DebugInfo {...debugData} />}
      <ScrollDownCTA />
      <main 
        className="relative z-20" 
        style={{ 
          visibility: preloadDone ? 'visible' : 'hidden',
          pointerEvents: scrollEnabled ? 'auto' : 'none',
          overflow: scrollEnabled ? 'auto' : 'hidden',
          // Ensure proper scrolling on mobile
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y'
        }}
      >
        <div ref={hero} className="min-h-screen">
          <HeroSection />
        </div>
        
        {/* Virtual content sections for marker progression */}
        {Array.from({ length: 10 }, (_, index) => {
          const markerData = [
            { 
              name: tMarker('floor.name'), 
              progress: "0-10%", 
              content: tMarker('floor.content')
            },
            { 
              name: tMarker('kitchenIsland.name'), 
              progress: "10-20%", 
              content: tMarker('kitchenIsland.content')
            },
            { 
              name: tMarker('kitchenBacksplash.name'), 
              progress: "20-30%", 
              content: tMarker('kitchenBacksplash.content')
            },
            { 
              name: tMarker('kitchenCabinet.name'), 
              progress: "30-40%", 
              content: tMarker('kitchenCabinet.content')
            },
            { 
              name: tMarker('kitchenCountertop.name'), 
              progress: "40-47%", 
              content: tMarker('kitchenCountertop.content')
            },
            { 
              name: tMarker('bathCountertop.name'), 
              progress: "47-75%", 
              content: tMarker('bathCountertop.content')
            },
            { 
              name: tMarker('coffeeTable.name'), 
              progress: "75-80%", 
              content: tMarker('coffeeTable.content')
            },
            { 
              name: tMarker('fireplace.name'), 
              progress: "80-88%", 
              content: tMarker('fireplace.content')
            },
            { 
              name: tMarker('shelves.name'), 
              progress: "88-95%", 
              content: tMarker('shelves.content')
            },
            { 
              name: tMarker('accentWall.name'), 
              progress: "95-100%", 
              content: tMarker('accentWall.content')
            }
          ];
          
          const marker = markerData[index];
          
          
          return (
            <div 
              key={`marker-section-${index}`} 
              className="h-screen relative overflow-hidden"
              style={{ 
                opacity: 1,
                // Ensure proper height on mobile devices
                minHeight: '100dvh' // Dynamic viewport height for mobile
              }}
            >
              {/* Marker Panel - Responsive Full Width at Bottom */}
              <div 
                className="fixed z-50 w-full backdrop-blur-sm border-b border-light-dark dark:border-gray-700"
                style={{
                  bottom: '0px',
                  height: window.innerWidth < 640 ? '100px' : window.innerWidth < 1024 ? '110px' : '120px',
                  backgroundColor: `hsl(var(--background) / 0.8)`,
                  // Ensure proper touch interaction
                  touchAction: 'none',
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none',
                  userSelect: 'none'
                }}
                data-marker-index={index}
                data-marker-name={marker.name}
                data-progress-start={marker.progress.split('-')[0].replace('%', '')}
                data-progress-end={marker.progress.split('-')[1].replace('%', '')}
              >
                <div className="max-w-4xl mx-auto px-3 sm:px-4 py-1 sm:py-2 h-full flex flex-col justify-center">
                  <h3 className="text-foreground text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2 leading-tight">
                    {marker.name}
                  </h3>
                  <p className="text-muted-foreground text-sm sm:text-base md:text-lg leading-relaxed">
                    {marker.content}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        
        <div ref={env} className="min-h-screen">
          <EnvironmentalSection />
        </div>
        <div ref={comparison} className="min-h-screen opacity-90">
          <ComparisonSection />
        </div>
        <div ref={speed} className="min-h-screen opacity-90">
          <SpeedSection />
        </div>
        <div ref={gallery} className="min-h-screen opacity-90">
          <GallerySection />
        </div>
        <div ref={beforeAfter} className="min-h-screen opacity-90">
          <BeforeAndAfterSection />
        </div>
        <div ref={featured} className="min-h-screen opacity-90">
          <FeaturedShowcase />
        </div>
        <div ref={texture} className="min-h-screen opacity-90">
          <TextureSamples />
        </div>
        <div ref={luxury} className="min-h-screen opacity-90">
          <LuxurySection />
        </div>
        <div ref={benefits} className="min-h-screen opacity-90">
          <BenefitsSection />
        </div>
        <div ref={cta} className="min-h-screen">
          <CTASection />
        </div>
      </main>
    </div>
  )
} 