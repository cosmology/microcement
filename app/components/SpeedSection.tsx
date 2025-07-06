"use client"

import { motion } from "framer-motion"
import { useRef, useEffect, useState } from "react"

export default function SpeedSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLHeadingElement>(null)
  const subheaderRef = useRef<HTMLDivElement>(null)
  const leftContentRef = useRef<HTMLDivElement>(null)
  const rightContentRef = useRef<HTMLDivElement>(null)

  // State for each animated element
  const [headerState, setHeaderState] = useState({ visible: false, out: false })
  const [subheaderState, setSubheaderState] = useState({ visible: false, out: false })
  const [leftContentState, setLeftContentState] = useState({ visible: false, out: false })
  const [rightContentState, setRightContentState] = useState({ visible: false, out: false })

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
      setSubheaderState(getState(subheaderRef))
      setLeftContentState(getState(leftContentRef))
      setRightContentState(getState(rightContentRef))
    }
    
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Animation helper
  function getAnim(state: { visible: boolean; out: boolean }) {
    return {
      opacity: state.visible && !state.out ? 1 : 0,
      y: state.out ? -40 : state.visible ? 0 : 40,
    }
  }

  return (
    <section id="speed" ref={sectionRef} className="py-20 bg-white dark:bg-gray-900 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          ref={headerRef}
          initial={{ opacity: 0, y: 40 }}
          animate={getAnim(headerState)}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-4xl md:text-5xl font-bold text-center mb-12 text-gray-900 dark:text-white"
        >
          Speed & Efficiency
        </motion.h2>

        <motion.div
          ref={subheaderRef}
          initial={{ opacity: 0, y: 40 }}
          animate={getAnim(subheaderState)}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
          className="flex flex-col md:flex-row justify-center items-center mb-12 space-y-4 md:space-y-0 md:space-x-8"
        >
          <h3 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-200">
            Installation in Hours, Not Days
          </h3>
          <h3 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-200">
            Minimal Disruption
          </h3>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12">
          <motion.div
            ref={leftContentRef}
            initial={{ opacity: 0, y: 50 }}
            animate={getAnim(leftContentState)}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.4 }}
            className="space-y-6"
          >
            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
              Traditional remodels can take weeks, with noise, dust, and downtime. Our micro-cement application is
              efficient and non-invasive — typically completed in 3–5 days. There's no need to tear out existing
              finishes, which means faster transformations and less disruption to your daily life or business
              operations.
            </p>
          </motion.div>

          <motion.div
            ref={rightContentRef}
            initial={{ opacity: 0, y: 50 }}
            animate={getAnim(rightContentState)}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.6 }}
            className="space-y-6"
          >
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white">
              Quick Application
            </h4>
            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
              No need to shut down your café, leave your home, or relocate your staff. Our quick-dry systems and
              low-odor materials allow you to return to your space almost immediately after completion.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
