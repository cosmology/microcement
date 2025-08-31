"use client"

import { motion } from "framer-motion"
import { useRef, useEffect, useState, useMemo, useCallback } from "react"
import { globalNavigation } from "@/lib/navigation"
import { useTranslations } from 'next-intl';
import { AnimatePresence } from "framer-motion"

export default function HeroSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const t = useTranslations('Hero');
  
  // The lines
  const mainLine = t('line1') // "Transform Spaces."
  const animatedLines = [t('line2'), t('line3'), t('line4')]

  // Animation state
  const [mainIn, setMainIn] = useState(false)
  const [currentLine, setCurrentLine] = useState(0)
  const [showAnimated, setShowAnimated] = useState(true)
  const [rainfall, setRainfall] = useState(false)

  // Animate main line in on mount
  useEffect(() => {
    setMainIn(true)
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

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen w-full flex items-center justify-center px-6 overflow-hidden transition-colors duration-200"
      style={{ scrollSnapAlign: "start", opacity: 0.5 }}
    >
      <div className="w-full max-w-4xl flex flex-col items-center justify-center text-center relative z-10">
        {/* Main line slides in from top and stays */}
        <motion.div
          className="font-light text-gray-900 dark:text-white mb-8"
          style={{ fontSize: 'clamp(2rem, 7vw, 4rem)', lineHeight: 1.05 }}
          initial={{ opacity: 0, y: -80 }}
          animate={mainIn ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {mainLine.toUpperCase()}
        </motion.div>
        {/* Animated lines, one at a time, rotating */}
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
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 leading-relaxed max-w-3xl mx-auto pt-24"
        >
          {t('description')}
        </motion.p>
      </div>
    </section>
  )
}
