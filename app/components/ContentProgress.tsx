'use client'

import { useEffect, useState } from 'react'
import { motion, useTransform, useMotionValue } from 'framer-motion'
import { orientation } from '@/lib/utils'

export default function ContentProgress() {
  const [isPortrait, setIsPortrait] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [introComplete, setIntroComplete] = useState(false)
  const [startTracking, setStartTracking] = useState(false)
  // Removed useScroll and useSpring - using custom scroll listener instead

  // Use a motion value that starts at 0 and only updates after intro completion
  const progressValue = useMotionValue(0)
  
  // Initial state - start completely hidden (0%)
  const initialClipPath = isPortrait ? 'inset(0 0 100% 0)' : 'inset(0 100% 0 0)'
  
  // Create transforms conditionally to avoid immediate calculation
  const verticalClipPath = useTransform(progressValue, [0, 1], ['inset(0 0 100% 0)', 'inset(0 0 0% 0)'])
  const horizontalClipPath = useTransform(progressValue, [0, 1], ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'])
  
  // Update progress value only after intro completion
  useEffect(() => {
    if (introComplete) {
      console.log('🎬 ContentProgress: Intro completed, resetting scroll and starting tracking')
      
      // Reset scroll position to 0 when intro completes
      setTimeout(() => {
        window.scrollTo(0, 0)
        console.log('🎬 ContentProgress: Scroll position reset to 0')
        
        // Reset progress to 0 and start tracking
        progressValue.set(0)
        setStartTracking(true)
        
        // Create custom scroll listener that starts from 0
        const handleScroll = () => {
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop
          const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
          const progress = scrollHeight > 0 ? scrollTop / scrollHeight : 0
          
          //console.log('🎬 ContentProgress: Custom scroll progress:', progress)
          progressValue.set(progress)
        }
        
        // Add scroll listener
        window.addEventListener('scroll', handleScroll, { passive: true })
        
        // Initial call
        handleScroll()
        
        return () => {
          window.removeEventListener('scroll', handleScroll)
        }
      }, 100) // Small delay to ensure intro animation is fully complete
    }
  }, [introComplete, progressValue])

  useEffect(() => {
    // Mark as client-side rendered
    setIsClient(true)
    
    // Check initial orientation
    setIsPortrait(orientation.isPortrait())

    // Listen for orientation changes
    const handleResize = () => {
      setIsPortrait(orientation.isPortrait())
    }

    // Listen for intro completion
    const handleIntroComplete = () => {
      console.log('🎬 ContentProgress: Intro completed, mounting progress bar')
      setIntroComplete(true)
      // Reset scroll position to 0 when intro completes
      setTimeout(() => {
        window.scrollTo(0, 0)
        console.log('🎬 ContentProgress: Scroll position reset to 0')
      }, 100) // Small delay to ensure intro animation is fully complete
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    window.addEventListener('introComplete', handleIntroComplete)

    // Fallback: Check if intro is already complete after a delay
    const fallbackCheck = setTimeout(() => {
      if (!introComplete) {
        // Check scroll position manually
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
        const progress = scrollHeight > 0 ? scrollTop / scrollHeight : 0
        
        if (progress < 0.1) {
          console.log('🎬 ContentProgress: Fallback - intro appears complete, mounting progress bar')
          setIntroComplete(true)
        }
      }
    }, 2000) // Check after 2 seconds

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
      window.removeEventListener('introComplete', handleIntroComplete)
      clearTimeout(fallbackCheck)
    }
  }, [])

  // Don't render anything until client-side hydration is complete AND intro is complete
  if (!isClient || !introComplete) {
    return null
  }

  console.log('ContentProgress rendering:', { 
    isPortrait, 
    progressValue: progressValue.get(),
    verticalClipPath: verticalClipPath.get(),
    horizontalClipPath: horizontalClipPath.get(),
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    introComplete,
    startTracking
  })

  return (
    <div
      className="fixed pointer-events-none"
      style={{
        zIndex: 9999,
        // backgroundColor: 'red', // Debug color
        // Portrait: right side, vertical line
        ...(isPortrait && {
          right: '0',
          top: '0',
          width: '5px',
          height: '100vh'
        }),
        // Landscape: top side, horizontal line
        ...(!isPortrait && {
          top: '0',
          left: '0',
          width: '100vw',
          height: '5px'
        })
      }}
    >
      {/* Background line */}
      <div
        className="absolute bg-transparent"
        style={{
          ...(isPortrait && {
            width: '5px',
            height: '100%',
            left: '0',
            top: '0'
          }),
          ...(!isPortrait && {
            width: '100%',
            height: '5px',
            left: '0',
            top: '0'
          })
        }}
      />
      
      {/* Progress line */}
      <motion.div
        className="absolute"
        style={{
          backgroundColor: '#8b5cf6', // Purple color like pulsing markers
          ...(isPortrait && {
            width: '5px',
            height: '100%',
            left: '0',
            top: '0'
          }),
          ...(!isPortrait && {
            width: '100%',
            height: '5px',
            left: '0',
            top: '0'
          }),
          clipPath: isPortrait ? verticalClipPath : horizontalClipPath
        }}
        initial={{
          clipPath: initialClipPath
        }}
      />
    </div>
  )
}