"use client"

import { motion } from "framer-motion"
import { useRef, useEffect, useState } from "react"

export default function LuxurySection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLHeadingElement>(null)
  const paraRef = useRef<HTMLDivElement>(null)

  // State for each animated element
  const [headerState, setHeaderState] = useState({ visible: false, out: false })
  const [paraState, setParaState] = useState({ visible: false, out: false })
  
  // Force intro state for navigation triggers
  const [forceIntro, setForceIntro] = useState(false)

  useEffect(() => {
    function onScroll() {
      // Helper for each element
      function getState(ref: React.RefObject<HTMLElement>) {
        if (!ref.current) return { visible: false, out: false }
        const rect = ref.current.getBoundingClientRect()
        return {
          visible: rect.top < window.innerHeight * 0.8,
          out: rect.top < 50,
        }
      }
      
      setHeaderState(getState(headerRef))
      // Paragraph only visible after header is fully visible and not out
      if (paraRef.current && headerRef.current) {
        const paraRect = paraRef.current.getBoundingClientRect()
        const headerRect = headerRef.current.getBoundingClientRect()
        const headerVisible = headerRect.top < window.innerHeight * 0.8 && headerRect.top >= 50
        setParaState({
          visible: headerVisible && paraRect.top < window.innerHeight * 0.8,
          out: paraRect.top < 50,
        })
      }
    }
    
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Listen for navigation events
  useEffect(() => {
    function onNavActivate(e: any) {
      if (e.detail?.sectionId === "luxury") {
        setForceIntro(true)
        // Reset after animation completes
        setTimeout(() => setForceIntro(false), 1200)
      }
    }
    window.addEventListener("section-nav-activate", onNavActivate)
    return () => window.removeEventListener("section-nav-activate", onNavActivate)
  }, [])

  // Animation helper with force intro support
  function getAnim(state: { visible: boolean; out: boolean }, force = false) {
    if (force) {
      return { opacity: 1, y: 0 }
    }
    return {
      opacity: state.visible && !state.out ? 1 : 0,
      y: state.out ? -40 : state.visible ? 0 : 40,
    }
  }

  return (
    <section 
      ref={sectionRef} 
      className="py-20 bg-gray-50 dark:bg-gray-800 px-6"
    >
      <div className="max-w-6xl mx-auto text-center">
        <motion.h2
          ref={headerRef}
          initial={{ opacity: 0, y: 40 }}
          animate={getAnim(headerState, forceIntro)}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-12"
          style={{ fontFamily: '"Publico Banner", "Frutiger LT Pro", "Narkiss Tam", sans-serif' }}
        >
          A New Kind of Luxury
        </motion.h2>

        <motion.div
          ref={paraRef}
          initial={{ opacity: 0, y: 40 }}
          animate={getAnim(paraState, forceIntro)}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="max-w-4xl mx-auto"
        >
          <p className="text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
            While concrete can feel heavy and industrial, micro-cement delivers a refined, tactile finish that feels
            both minimal and high-end. With a range of customizable colors and textures, it elevates any design language
            — from modern to rustic.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
