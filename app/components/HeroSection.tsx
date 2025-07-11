"use client"

import { motion } from "framer-motion"
import { useRef, useEffect, useState } from "react"
import { globalNavigation } from "@/lib/navigation"

const LINES = [
  { text: "Transform Spaces.", from: "left" },
  { text: "Sustainably.", from: "right" },
  { text: "Stylishly.", from: "left" },
  { text: "Fast.", from: "right" },
]

export default function HeroSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(HTMLDivElement | null)[]>([])
  const [lineStates, setLineStates] = useState(
    LINES.map(() => ({ visible: false, out: false }))
  )
  const [hasAutoNavigated, setHasAutoNavigated] = useState(false)

  useEffect(() => {
    function onScroll() {
      if (!sectionRef.current) return
      
      const scrollY = window.scrollY
      const isAtTop = scrollY < 100 // More generous threshold for top of page
      
      const newStates = LINES.map((_, i) => {
        const line = lineRefs.current[i]
        if (!line) return { visible: false, out: false }
        const rect = line.getBoundingClientRect()
        
        // Special handling for first line (Transform) - always visible at top
        if (i === 0 && isAtTop) {
          return { visible: true, out: false }
        }
        
        const visible = rect.top < window.innerHeight * 0.8
        const out = rect.top < 50
        return { visible, out }
      })
      setLineStates(newStates)

      // Check if all lines are faded out and EnvironmentalSection is partially visible
      const allLinesOut = newStates.every(state => state.out)
      const environmentalSection = document.querySelector('#environmental')
      
      if (allLinesOut && environmentalSection && !hasAutoNavigated) {
        const envRect = environmentalSection.getBoundingClientRect()
        const envPartiallyVisible = envRect.top < window.innerHeight && envRect.bottom > 0
        
        if (envPartiallyVisible) {
          // Auto-navigate to EnvironmentalSection
          globalNavigation.triggerNavigation('environmental')
          setHasAutoNavigated(true)
        }
      }
    }
    
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [hasAutoNavigated])

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-6 overflow-hidden transition-colors duration-200"
      style={{ scrollSnapAlign: "start" }}
    >
      <div className="w-full max-w-4xl flex flex-col items-center justify-center text-center relative z-10">
        <div className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white leading-tight sm:leading-relaxed flex flex-col gap-2 sm:gap-4 w-full">
          {LINES.map((line, i) => {
            let initialX = line.from === "left" ? -120 : 120
            let animateX = lineStates[i].visible ? 0 : initialX
            let animateY = lineStates[i].out ? -20 : 0
            let opacity = lineStates[i].visible ? 1 : 1
            if (lineStates[i].out) opacity = 0

            return (
              <motion.div
                key={i}
                ref={el => (lineRefs.current[i] = el)}
                initial={{ x: initialX, opacity: 0, y: 0 }}
                animate={{ x: animateX, opacity, y: animateY }}
                transition={{
                  type: "spring",
                  stiffness: 60,
                  damping: 20,
                  duration: 0.6,
                }}
                className={[
                  i === 1 ? "text-gray-700 dark:text-gray-300" : "",
                  i === 2 ? "text-gray-600 dark:text-gray-400" : "",
                  i === 3 ? "text-gray-800 dark:text-gray-200" : "",
                  "block w-full break-words",
                ].join(" ")}
                style={{ willChange: "transform, opacity" }}
              >
                {line.text}
              </motion.div>
            )
          })}
        </div>
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{
            opacity: lineStates[3].visible && !lineStates[3].out ? 1 : 0,
            y: lineStates[3].visible && !lineStates[3].out ? 0 : 30,
          }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 leading-relaxed max-w-3xl mx-auto pt-24"
        >
          Micro-cement is more than a surface solution — it's a design revolution. Whether you're updating a home,
          retail space, or showroom, our innovative finishes combine elegance with efficiency and eco-conscious
          performance.
        </motion.p>
      </div>
    </section>
  )
}
