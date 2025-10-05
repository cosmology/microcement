"use client"

import { useRef, useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { useTranslations } from 'next-intl';

interface BeforeAfterPair {
  id: number
  beforeColor: string
  afterColor: string
  beforeUrl?: string
  afterUrl?: string
  title: string
}

export default function BeforeAndAfterSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLDivElement>(null)
  const carouselRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLHeadingElement>(null)
  const [sliderX, setSliderX] = useState(50)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)
  const [containerCenter, setContainerCenter] = useState(0)
  const [headerState, setHeaderState] = useState({ visible: false, out: false })
  const [forceIntro, setForceIntro] = useState(false)
  const t = useTranslations('BeforeAfter');

  // Use useMemo to prevent recreation of beforeAfterPairs array on every render
  const beforeAfterPairs: BeforeAfterPair[] = useMemo(() => [
    { 
      id: 1, 
      beforeColor: "#f8f9fa", 
      afterColor: "#1a1a1a", 
      beforeUrl: "/images/gallery/b&a/bath_before.jpg",
      afterUrl: "/images/gallery/b&a/bath_after.jpg",
      title: t('items.bathroom.title')
    },
    { 
      id: 2, 
      beforeColor: "#ced4da", 
      afterColor: "#525252", 
      beforeUrl: "/images/gallery/b&a/sunset-salon-before.png",
      afterUrl: "/images/gallery/b&a/sunset-salon-after.png",
      title: t('items.commercial.title')
    },
    { id: 3, beforeColor: "#e9ecef", afterColor: "#2d2d2d", title: t('items.kitchen.title') },
    { id: 4, beforeColor: "#dee2e6", afterColor: "#404040", title: t('items.bathroomWalls.title') },
    { id: 5, beforeColor: "#adb5bd", afterColor: "#666666", title: t('items.livingRoom.title') },
    { id: 6, beforeColor: "#6c757d", afterColor: "#808080", title: t('items.patio.title') },
  ], [t]);

  const currentPair = beforeAfterPairs[currentIndex]

  // Calculate container dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (carouselRef.current) {
        const rect = carouselRef.current.getBoundingClientRect()
        setContainerWidth(rect.width)
        setContainerHeight(rect.height)
        setContainerCenter(rect.width / 2)
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    window.addEventListener('mousemove', updateDimensions)

    return () => {
      window.removeEventListener('resize', updateDimensions)
      window.removeEventListener('mousemove', updateDimensions)
    }
  }, [])

  // Header animation logic
  useEffect(() => {
    const handleScroll = () => {
      if (!headerRef.current) return
      
      const rect = headerRef.current.getBoundingClientRect()
      const isVisible = rect.bottom > 0 && rect.top < window.innerHeight
      const isOut = rect.top < 50 // 50px from top triggers fade out
      
      setHeaderState({ visible: isVisible, out: isOut })
    }

    // Navigation trigger listener
    const handleNavigation = (e: CustomEvent) => {
      if (e.detail.sectionId === 'before-after') {
        setForceIntro(true)
        setTimeout(() => setForceIntro(false), 1500)
      }
    }

    window.addEventListener('scroll', handleScroll)
    window.addEventListener('section-nav-activate', handleNavigation as EventListener)
    
    // Initial check
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('section-nav-activate', handleNavigation as EventListener)
    }
  }, [])

  // Drag logic
  function handleDrag(e: React.MouseEvent | React.TouchEvent) {
    let clientX: number
    if ("touches" in e) {
      clientX = e.touches[0].clientX
    } else {
      clientX = e.clientX
    }
    
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    let percent = ((clientX - rect.left) / rect.width) * 100
    percent = Math.max(0, Math.min(100, percent))
    setSliderX(percent)
  }

  // Calculate responsive font size based on container width
  const getResponsiveFontSize = () => {
    if (containerWidth < 400) return 'text-sm' // 14px
    if (containerWidth < 600) return 'text-base' // 16px
    if (containerWidth < 800) return 'text-lg' // 18px
    if (containerWidth < 1000) return 'text-xl' // 20px
    if (containerWidth < 1200) return 'text-2xl' // 24px
    return 'text-3xl' // 30px+
  }

  // Calculate positions for 3D perspective
  const calculateItemPosition = (index: number) => {
    const activeWidth = Math.min(containerWidth * 0.6, containerWidth); // Clamp to container width
    const nonActiveWidth = Math.min(containerWidth * 0.15, containerWidth); // Clamp to container width
    
    if (index === currentIndex) {
      // Active item is centered
      return {
        width: activeWidth,
        left: Math.max(0, containerCenter - (activeWidth / 2)),
        top: (containerHeight - (activeWidth * 0.5)) / 2,
        scale: 1,
        opacity: 1,
        zIndex: 20,
        blur: 0
      }
    } else {
      const distance = index - currentIndex
      const isLeft = distance < 0
      
      let left: number
      if (isLeft) {
        left = Math.max(0, containerCenter - (activeWidth / 2) - (Math.abs(distance) * nonActiveWidth * 1.2));
      } else {
        left = Math.min(containerWidth - nonActiveWidth, containerCenter + (activeWidth / 2) + ((distance - 1) * nonActiveWidth * 1.2));
      }
      
      const scale = Math.max(0.3, 1 - Math.abs(distance) * 0.25)
      const opacity = Math.max(0.2, 1 - Math.abs(distance) * 0.4)
      const zIndex = 20 - Math.abs(distance)
      const blur = Math.min(8, Math.abs(distance) * 2)
      
      const itemHeight = nonActiveWidth * 0.5
      const top = (containerHeight - (itemHeight * scale)) / 2
      
      return {
        width: nonActiveWidth,
        left,
        top,
        scale,
        opacity,
        zIndex,
        blur
      }
    }
  }

  return (
    <section id="before-after" ref={sectionRef} className="w-full flex flex-col items-center py-20 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-6xl mx-auto px-4">
        <motion.h2 
          ref={headerRef}
          className="text-4xl md:text-5xl font-light text-center text-gray-900 dark:text-white"
          initial={{ opacity: 0 }}
          animate={{
            opacity: (headerState.visible && !headerState.out) || forceIntro ? 1 : 0,
            y: (headerState.visible && !headerState.out) || forceIntro ? 0 : (headerState.out ? 0 : 40)
          }}
        >
          {t('title')}
        </motion.h2>
        
        {/* Carousel Container - Increased height to accommodate title and shadows */}
        <div 
          ref={carouselRef}
          className="relative w-full h-[26rem] overflow-visible"
        >
          {beforeAfterPairs.map((pair, idx) => {
            const position = calculateItemPosition(idx)
            const isActive = idx === currentIndex
            
            return (
              <motion.div
                key={pair.id}
                className="absolute transition-all duration-500 ease-in-out"
                style={{
                  width: position.width,
                  left: position.left,
                  top: position.top,
                  transform: `scale(${position.scale})`,
                  opacity: position.opacity,
                  zIndex: position.zIndex,
                  filter: `blur(${position.blur}px)`
                }}
              >
                {/* Before/After Slider */}
                <div
                  ref={isActive ? containerRef : null}
                  className={`relative w-full aspect-[2/1] rounded-xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing border border-light-dark dark:border-gray-700 ${
                    isActive ? '' : ''
                  }`}
                  style={{ background: pair.beforeColor }}
                  onMouseDown={isActive ? (e) => {
                    e.preventDefault()
                    const onMouseMove = (ev: MouseEvent) => handleDrag(ev as any)
                    const onMouseUp = () => {
                      document.removeEventListener('mousemove', onMouseMove)
                      document.removeEventListener('mouseup', onMouseUp)
                    }
                    document.addEventListener('mousemove', onMouseMove)
                    document.addEventListener('mouseup', onMouseUp)
                  } : undefined}
                  onTouchStart={isActive ? (e) => {
                    const onTouchMove = (ev: Event) => {
                      const touchEv = ev as TouchEvent;
                      touchEv.preventDefault();
                      handleDrag(touchEv as any);
                    }
                    const onTouchEnd = () => {
                      document.removeEventListener('touchmove', onTouchMove);
                      document.removeEventListener('touchend', onTouchEnd);
                    }
                    document.addEventListener('touchmove', onTouchMove, { passive: false });
                    document.addEventListener('touchend', onTouchEnd);
                  } : undefined}
                >
                  {/* Before Image/Color Background */}
                  <div className="absolute inset-0">
                    {pair.beforeUrl ? (
                      <Image
                        src={pair.beforeUrl}
                        alt={`Before - ${pair.title}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div 
                        className="w-full h-full"
                        style={{ background: pair.beforeColor }}
                      />
                    )}
                  </div>
                  
                  {/* After Image/Color (revealed by slider) */}
                  <div 
                    className="absolute inset-0"
                    style={{ 
                      clipPath: isActive ? `polygon(${sliderX}% 0, 100% 0, 100% 100%, ${sliderX}% 100%)` : 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)'
                    }}
                  >
                    {pair.afterUrl ? (
                      <Image
                        src={pair.afterUrl}
                        alt={`After - ${pair.title}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div 
                        className="w-full h-full"
                        style={{ background: pair.afterColor }}
                      />
                    )}
                  </div>
                  
                  {/* Slider handle */}
                  <div 
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize"
                    style={{ left: isActive ? `${sliderX}%` : '50%' }}
                  >
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg border-2 border-gray-300 flex items-center justify-center">
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Labels - Only show on active item */}
                  {isActive && (
                    <>
                      <div className="absolute top-4 left-4 bg-white/90 dark:bg-gray-800/90 px-3 py-1 rounded-full text-sm font-medium text-gray-900 dark:text-white">
                        {t('labels.before')}
                      </div>
                      <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-800/90 px-3 py-1 rounded-full text-sm font-medium text-gray-900 dark:text-white">
                        {t('labels.after')}
                      </div>
                    </>
                  )}
                </div>
                
                {/* Title - Positioned under the container, only for active item */}
                {isActive && (
                  <div className={`py-12 text-center font-semibold text-gray-900 dark:text-white ${getResponsiveFontSize()}`}>
                    {pair.title}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Navigation Arrows - Only show when there are items to navigate to */}
        <div className="flex justify-between items-center max-w-4xl mx-auto bg-transparent">
          {/* Left arrow - only show if not at first item */}
          {currentIndex > 0 && (
            <motion.button
              onClick={() => {
                setCurrentIndex(prev => prev - 1)
                setSliderX(50)
              }}
              className="p-4 rounded-full bg-white/20 dark:bg-gray-800/20 backdrop-blur-md shadow-lg border border-white/30 dark:border-gray-700/30 hover:bg-white/30 dark:hover:bg-gray-800/30 transition-all    duration-100"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </motion.button>
          )}
          
          {/* Spacer when left arrow is hidden */}
          {currentIndex === 0 && <div className="w-16"></div>}

          {/* Right arrow - only show if not at last item */}
          {currentIndex < beforeAfterPairs.length - 1 && (
            <motion.button
              onClick={() => {
                setCurrentIndex(prev => prev + 1)
                setSliderX(50)
              }}
              className="p-4 rounded-full bg-white/20 dark:bg-gray-800/20 backdrop-blur-md shadow-lg border border-white/30 dark:border-gray-700/30 hover:bg-white/30 dark:hover:bg-gray-800/30 transition-all    duration-100"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </motion.button>
          )}
          
          {/* Spacer when right arrow is hidden */}
          {currentIndex === beforeAfterPairs.length - 1 && <div className="w-16"></div>}
        </div>

        {/* Carousel Thumbnails */}
        <div className="flex justify-center items-center mt-4 space-x-4">
          {beforeAfterPairs.map((pair, idx) => (
            <button
              key={pair.id}
              onClick={() => {
                setCurrentIndex(idx)
                setSliderX(50)
              }}
              className={`w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all    duration-100 overflow-hidden
                ${idx === currentIndex
                  ? "border-primary-500 scale-110 shadow-lg"
                  : "border-gray-300 opacity-60 hover:opacity-100"
                }`}
              style={{
                background: pair.beforeUrl ? 'transparent' : `linear-gradient(90deg, ${pair.beforeColor} 50%, ${pair.afterColor} 50%)`
              }}
              aria-label={`Show ${pair.title}`}
            >
              {pair.beforeUrl ? (
                <Image
                  src={pair.beforeUrl}
                  alt={pair.title}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl"></span>
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
} 