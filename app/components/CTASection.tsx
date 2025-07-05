"use client"

import { motion } from "framer-motion"
import { useRef, useEffect, useState } from "react"

export default function CTASection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLHeadingElement>(null)
  const paraRef = useRef<HTMLParagraphElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // State for each animated element
  const [headerState, setHeaderState] = useState({ visible: false, out: false })
  const [paraState, setParaState] = useState({ visible: false, out: false })
  const [buttonState, setButtonState] = useState({ visible: false, out: false })

  useEffect(() => {
    function onScroll() {
      // Helper for each element with different trigger points
      function getState(ref: React.RefObject<HTMLElement>, triggerPoint: number = 0.8) {
        if (!ref.current) return { visible: false, out: false }
        const rect = ref.current.getBoundingClientRect()
        return {
          visible: rect.top < window.innerHeight * triggerPoint,
          out: rect.top < 50,
        }
      }
      
      setHeaderState(getState(headerRef, 0.8))
      setParaState(getState(paraRef, 0.8))
      // Button triggers when closer to bottom edge (0.9 instead of 0.8)
      setButtonState(getState(buttonRef, 0.9))
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
    <section ref={sectionRef} className="py-20 bg-gray-900 dark:bg-gray-800 text-white px-6">
      <div className="max-w-4xl mx-auto text-center">
        <motion.h2
          ref={headerRef}
          initial={{ opacity: 0, y: 40 }}
          animate={getAnim(headerState)}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-4xl md:text-5xl font-bold mb-8"
          style={{ fontFamily: '"Publico Banner", "Frutiger LT Pro", "Narkiss Tam", sans-serif' }}
        >
          Ready for a Surface That Works Harder and Looks Better?
        </motion.h2>

        <motion.p
          ref={paraRef}
          initial={{ opacity: 0, y: 40 }}
          animate={getAnim(paraState)}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          className="text-xl mb-12 text-gray-300 dark:text-gray-200"
        >
          Book a consultation today to see how micro-cement can elevate your space — quickly, cleanly, and sustainably.
        </motion.p>

        <motion.button
          ref={buttonRef}
          initial={{ opacity: 0, y: 40 }}
          animate={getAnim(buttonState)}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-white text-gray-900 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors duration-200 shadow-lg"
        >
          Book Consultation
        </motion.button>
      </div>
    </section>
  )
}
