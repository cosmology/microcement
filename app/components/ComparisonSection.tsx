"use client"

import { motion } from "framer-motion"
import { useRef, useEffect, useState } from "react"

const comparisonElements = [
  {
    id: "header",
    type: "h2",
    content: "Why Micro-Cement vs. Traditional Materials",
    className: "text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-8"
  },
  {
    id: "subheader", 
    type: "h3",
    content: "Sleek. Seamless. Surprisingly Versatile.",
    className: "text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-200 mb-12"
  },
  {
    id: "paragraph",
    type: "p",
    content: "Unlike tiles or wood, micro-cement creates continuous surfaces — no grout lines, joints, or interruptions. It's waterproof, durable, and adaptable to almost any surface: floors, walls, countertops, stairs, showers — even furniture.",
    className: "text-xl text-gray-700 dark:text-gray-300 leading-relaxed"
  }
]

export default function ComparisonSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const elementsRefs = useRef<(HTMLDivElement | null)[]>([])

  // State for each animated element
  const [elementsStates, setElementsStates] = useState(
    comparisonElements.map(() => ({ visible: false, out: false }))
  )
  
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
      
      // Update states for each element
      const newElementsStates = comparisonElements.map((_, index) => {
        const ref = elementsRefs.current[index]
        if (!ref) return { visible: false, out: false }
        return getState({ current: ref })
      })
      setElementsStates(newElementsStates)
    }
    
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Listen for navigation events
  useEffect(() => {
    function onNavActivate(e: any) {
      if (e.detail?.sectionId === "comparison") {
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
      id="comparison"
      ref={sectionRef}
      className="py-20 bg-white dark:bg-gray-900 px-6"
    >
      <div className="max-w-6xl mx-auto text-center">
        {comparisonElements.map((element, index) => {
          const ElementType = element.type as keyof JSX.IntrinsicElements
          
          return (
            <motion.div
              key={element.id}
              ref={el => (elementsRefs.current[index] = el)}
              initial={{ opacity: 0, y: 40 }}
              animate={getAnim(elementsStates[index], forceIntro)}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className={element.type === "p" ? "max-w-4xl mx-auto" : ""}
            >
              <ElementType 
                className={element.className}
                style={element.type === "h2" || element.type === "h3" ? {} : {}}
              >
                {element.content}
              </ElementType>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
