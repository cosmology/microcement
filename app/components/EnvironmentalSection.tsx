"use client"

import { motion } from "framer-motion"
import { useRef, useEffect, useState } from "react"

// Animation constants
const ANIMATION_DURATION = 1
const ANIMATION_EASING = "easeOut"
const ANIMATION_Y_OFFSET = 20
const INITIAL_Y_OFFSET = 40
const SCROLL_VISIBILITY_THRESHOLD = 0.8
const SCROLL_OUT_THRESHOLD = 50

export default function EnvironmentalSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLHeadingElement>(null)
  const subheaderRef = useRef<HTMLHeadingElement>(null)
  const paraRef = useRef<HTMLDivElement>(null)
  const ecoHeaderRef = useRef<HTMLHeadingElement>(null)
  const ecoParaRef = useRef<HTMLParagraphElement>(null)

  // State for each element
  const [headerState, setHeaderState] = useState({ visible: false, out: false })
  const [subheaderState, setSubheaderState] = useState({ visible: false, out: false })
  const [paraState, setParaState] = useState({ visible: false, out: false })
  const [ecoHeaderState, setEcoHeaderState] = useState({ visible: false, out: false })
  const [ecoParaState, setEcoParaState] = useState({ visible: false, out: false })

  useEffect(() => {
    function onScroll() {
      // Helper for each element
      function getState(ref: React.RefObject<HTMLElement>) {
        if (!ref.current) return { visible: false, out: false }
        const rect = ref.current.getBoundingClientRect()
        return {
          visible: rect.top < window.innerHeight * SCROLL_VISIBILITY_THRESHOLD,
          out: rect.top < SCROLL_OUT_THRESHOLD,
        }
      }
      
      setHeaderState(getState(headerRef))
      setSubheaderState(getState(subheaderRef))
      
      // Paragraph only visible after subheader is fully visible and not out
      if (paraRef.current && subheaderRef.current) {
        const paraRect = paraRef.current.getBoundingClientRect()
        const subheaderRect = subheaderRef.current.getBoundingClientRect()
        const subheaderVisible = subheaderRect.top < window.innerHeight * SCROLL_VISIBILITY_THRESHOLD && subheaderRect.top >= SCROLL_OUT_THRESHOLD
        setParaState({
          visible: subheaderVisible && paraRect.top < window.innerHeight * SCROLL_VISIBILITY_THRESHOLD,
          out: paraRect.top < SCROLL_OUT_THRESHOLD,
        })
      }
      
      setEcoHeaderState(getState(ecoHeaderRef))
      
      // Eco paragraph only visible after eco header is fully visible and not out
      if (ecoParaRef.current && ecoHeaderRef.current) {
        const ecoParaRect = ecoParaRef.current.getBoundingClientRect()
        const ecoHeaderRect = ecoHeaderRef.current.getBoundingClientRect()
        const ecoHeaderVisible = ecoHeaderRect.top < window.innerHeight * SCROLL_VISIBILITY_THRESHOLD && ecoHeaderRect.top >= SCROLL_OUT_THRESHOLD
        setEcoParaState({
          visible: ecoHeaderVisible && ecoParaRect.top < window.innerHeight * SCROLL_VISIBILITY_THRESHOLD,
          out: ecoParaRect.top < SCROLL_OUT_THRESHOLD,
        })
      }
    }
    
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Animation helper
  function getAnim(state: { visible: boolean; out: boolean }) {
    return {
      opacity: state.visible && !state.out ? 1 : 0,
      y: state.out ? -ANIMATION_Y_OFFSET : state.visible ? 0 : ANIMATION_Y_OFFSET,
    }
  }

  return (
    <section 
      id="environmental" 
      ref={sectionRef} 
      className="py-20 bg-gray-50 dark:bg-gray-800 px-6"
    >
      <div className="max-w-6xl mx-auto">
        <motion.h2
          ref={headerRef}
          initial={{ opacity: 0, y: INITIAL_Y_OFFSET }}
          animate={getAnim(headerState)}
          transition={{ duration: ANIMATION_DURATION, ease: ANIMATION_EASING }}
          className="text-4xl md:text-5xl font-bold text-center mb-12 text-gray-900 dark:text-white"
        >
          Environmental Benefits
        </motion.h2>

        <motion.h3
          ref={subheaderRef}
          initial={{ opacity: 0, y: INITIAL_Y_OFFSET }}
          animate={getAnim(subheaderState)}
          transition={{ duration: ANIMATION_DURATION, ease: ANIMATION_EASING }}
          className="text-3xl md:text-4xl font-bold text-center text-gray-800 dark:text-gray-200 mb-12"
        >
          Sustainable. Responsible. Beautiful.
        </motion.h3>

        <motion.div
          ref={paraRef}
          initial={{ opacity: 0, y: INITIAL_Y_OFFSET }}
          animate={getAnim(paraState)}
          transition={{ duration: ANIMATION_DURATION, ease: ANIMATION_EASING }}
          className="max-w-4xl mx-auto mb-16"
        >
          <p className="text-xl text-gray-700 dark:text-gray-300 leading-relaxed text-center">
            Unlike traditional renovation materials that require extensive resources and generate significant waste, 
            micro-cement is applied directly over existing surfaces. This approach reduces material consumption by up to 80% 
            and eliminates the need for demolition, making it one of the most environmentally responsible choices for 
            surface renovation.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div>
            <motion.h4
              ref={ecoHeaderRef}
              initial={{ opacity: 0, y: INITIAL_Y_OFFSET }}
              animate={getAnim(ecoHeaderState)}
              transition={{ duration: ANIMATION_DURATION, ease: ANIMATION_EASING }}
              className="text-2xl font-bold text-gray-900 dark:text-white mb-6"
            >
              Eco-Friendly Composition
            </motion.h4>

            <motion.p
              ref={ecoParaRef}
              initial={{ opacity: 0, y: INITIAL_Y_OFFSET }}
              animate={getAnim(ecoParaState)}
              transition={{ duration: ANIMATION_DURATION, ease: ANIMATION_EASING }}
              className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed"
            >
              Our micro-cement formulations use natural minerals and low-VOC binders, ensuring minimal environmental 
              impact during both production and application. The material is free from harmful chemicals and meets 
              strict environmental standards, making it safe for homes, commercial spaces, and sensitive environments.
            </motion.p>
          </div>

          <div className="space-y-6">
            {/* Animated Info Cards */}
            <motion.div
              initial={{ opacity: 0, y: INITIAL_Y_OFFSET }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: ANIMATION_DURATION, ease: ANIMATION_EASING }}
              className="bg-white dark:bg-gray-700 p-6 rounded-lg border border-gray-200 dark:border-gray-600"
            >
              <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Reduced Waste
              </h5>
              <p className="text-gray-700 dark:text-gray-300">
                Up to 60% less CO2 emissions compared to traditional tile and stone installations.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: INITIAL_Y_OFFSET }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: ANIMATION_DURATION, ease: ANIMATION_EASING }}
              className="bg-white dark:bg-gray-700 p-6 rounded-lg border border-gray-200 dark:border-gray-600"
            >
              <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Longevity
              </h5>
              <p className="text-gray-700 dark:text-gray-300">
                Applied directly over existing surfaces, eliminating demolition waste and material disposal.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: INITIAL_Y_OFFSET }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: ANIMATION_DURATION, ease: ANIMATION_EASING }}
              className="bg-white dark:bg-gray-700 p-6 rounded-lg border border-gray-200 dark:border-gray-600"
            >
              <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Long-Term Durability
              </h5>
              <p className="text-gray-700 dark:text-gray-300">
                Lasts decades without replacement, reducing the need for frequent renovations and material consumption.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
