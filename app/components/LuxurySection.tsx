"use client"

import { motion } from "framer-motion"
import { useRef, useEffect, useState } from "react"
import { useTranslations } from 'next-intl';

export default function LuxurySection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLHeadingElement>(null)
  const paraRef = useRef<HTMLDivElement>(null)
  const t = useTranslations('Luxury');

  // State for each animated element
  const [headerState, setHeaderState] = useState({ visible: false, out: false })
  const [paraState, setParaState] = useState({ visible: false, out: false })

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
      setParaState(getState(paraRef))
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
    <section 
      id="luxury"
      ref={sectionRef} 
      className="py-20 bg-gray-50 dark:bg-gray-800 px-6"
    >
      <div className="max-w-6xl mx-auto text-center">
        <motion.h2
          ref={headerRef}
          initial={{ opacity: 0, y: 40 }}
          animate={getAnim(headerState)}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-4xl md:text-5xl font-light text-center mb-12 text-gray-900 dark:text-purple-200"
        >
          {t('title')}
        </motion.h2>

        <motion.div
          ref={paraRef}
          initial={{ opacity: 0, y: 40 }}
          animate={getAnim(paraState)}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="max-w-4xl mx-auto"
        >
          <p className="text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
            {t('description')}
          </p>
        </motion.div>
      </div>
    </section>
  )
}
