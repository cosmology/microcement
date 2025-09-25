"use client"

import { motion } from "framer-motion"
import { useRef, useEffect, useState, useMemo, useCallback } from "react"
import { globalNavigation } from "@/lib/navigation"
import { useTranslations } from 'next-intl';
import { AnimatePresence } from "framer-motion"
import { getThemeColors, orientation } from "@/lib/utils"

export default function HeroSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const t = useTranslations('Hero');
  
  // Headline: use explicit headers instead of splitting
  const header1 = t('header1') // e.g., "Transform"
  const header2 = t('header2') // e.g., "Spaces"
  const animatedLines = [t('line2'), t('line3'), t('line4')]

  // Animation state
  const [mainIn, setMainIn] = useState(false)
  const [currentLine, setCurrentLine] = useState(0)
  const [showAnimated, setShowAnimated] = useState(true)
  const [rainfall, setRainfall] = useState(false)
  const [scrollOpacity, setScrollOpacity] = useState(1)
  const [isPortrait, setIsPortrait] = useState(false)

  // Animate main line in on mount
  useEffect(() => {
    setMainIn(true)
    setIsPortrait(orientation.isPortrait())
    const onResize = () => setIsPortrait(orientation.isPortrait())
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])

  // Scroll-based fade out effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const windowHeight = window.innerHeight
      const fadeStart = windowHeight * 0.3 // Start fading after 30% of viewport
      const fadeEnd = windowHeight * 0.8 // Complete fade at 80% of viewport
      
      if (scrollY <= fadeStart) {
        setScrollOpacity(1)
      } else if (scrollY >= fadeEnd) {
        setScrollOpacity(0)
      } else {
        const fadeProgress = (scrollY - fadeStart) / (fadeEnd - fadeStart)
        setScrollOpacity(1 - fadeProgress)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Rotating animated lines
  useEffect(() => {
    if (!showAnimated) return
    let inTimeout: NodeJS.Timeout, outTimeout: NodeJS.Timeout, nextTimeout: NodeJS.Timeout
    setRainfall(false)
    // Animate in
    inTimeout = setTimeout(() => {
      setRainfall(true)
      // Animate out after 1.2s
      outTimeout = setTimeout(() => {
        setRainfall(false)
        // Next line after rainfall
        nextTimeout = setTimeout(() => {
          setCurrentLine((prev: number) => (prev + 1) % animatedLines.length)
        }, 400)
      }, 1200)
    }, 1600)
    return () => {
      clearTimeout(inTimeout)
      clearTimeout(outTimeout)
      clearTimeout(nextTimeout)
    }
  }, [currentLine, showAnimated])

  // Helper to split line into letters
  const splitLetters = useCallback((line: string) => line.toUpperCase().split("").map((char, i) => ({ char, i })), [])

  // Get theme colors
  const themeColors = getThemeColors()

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen w-full flex items-center justify-center px-6 overflow-hidden transition-colors duration-200"
      style={{ 
        scrollSnapAlign: "start", 
        opacity: scrollOpacity,
        background: themeColors.gradient
      }}
    >
      <div className="w-full max-w-5xl flex flex-col items-center justify-center text-center relative z-10">
        {/* Emphasized Line 1 + Line 2 */}
        {isPortrait ? (
          <div className="w-full flex flex-col items-center justify-center mb-4">
            <motion.div
              className="font-bold text-gray-900 dark:text-white"
              style={{ fontSize: 'clamp(2.4rem, 8vw, 4.5rem)', lineHeight: 1.03 }}
              initial={{ opacity: 0, x: -60 }}
              animate={mainIn ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              {header1}
            </motion.div>
            {header2 && (
              <motion.div
                className="font-bold text-gray-900 dark:text-white"
                style={{ fontSize: 'clamp(2.4rem, 8vw, 4.5rem)', lineHeight: 1.03 }}
                initial={{ opacity: 0, x: 60 }}
                animate={mainIn ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.05 }}
              >
                {header2}
              </motion.div>
            )}
          </div>
        ) : (
          <div className="w-full flex items-center justify-center mb-6">
            <motion.div
              className="font-bold text-gray-900 dark:text-white pr-2"
              style={{ fontSize: 'clamp(2.6rem, 7.5vw, 3.5rem)', lineHeight: 1.02 }}
              initial={{ opacity: 0, x: -80 }}
              animate={mainIn ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              {header1}
            </motion.div>
            {header2 && (
              <motion.div
                className="font-bold text-gray-900 dark:text-white pl-2"
                style={{ fontSize: 'clamp(2.6rem, 7.5vw, 3.5rem)', lineHeight: 1.02 }}
                initial={{ opacity: 0, x: 80 }}
                animate={mainIn ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.05 }}
              >
                {header2}
              </motion.div>
            )}
          </div>
        )}
        {/* Animated lines, one at a time, rotating */}
        {/* Lighter animated lines beneath */}
        <div className="flex flex-col w-full items-center justify-center"
             style={{ minHeight: 'clamp(2.2rem, 4vw, 4.5rem)' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentLine}
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={{
                hidden: { transition: { staggerChildren: 0.05 } },
                visible: { transition: { staggerChildren: 0.05 } },
                exit: { transition: { staggerChildren: 0.05 } },
              }}
              className="block w-full break-words font-light"
              style={{ fontSize: 'clamp(2rem, 7vw, 4rem)', minHeight: 'clamp(2rem, 4vw, 4rem)', lineHeight: 1.05, position: 'relative', left: 0, right: 0 }}
            >
              {splitLetters(animatedLines[currentLine]).map(({ char, i }) => (
                <motion.span
                  key={i}
                  variants={{
                    hidden: { opacity: 0, y: -50 },
                    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 16 } },
                    exit: { opacity: 0, y: 50, transition: { duration: 0.4, ease: "easeIn" } },
                  }}
                  style={{ display: 'inline-block', whiteSpace: char === ' ' ? 'pre' : 'normal' }}
                >
                  {char}
                </motion.span>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
        {/* <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 leading-relaxed max-w-3xl mx-auto pt-24"
        >
          {t('description')}
        </motion.p> */}
      </div>
    </section>
  )
}
