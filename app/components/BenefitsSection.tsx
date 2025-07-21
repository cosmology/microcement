"use client"

import { motion } from "framer-motion"
import { useRef, useEffect, useState, useMemo } from "react"
import { useTranslations } from 'next-intl';

export default function BenefitsSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLHeadingElement>(null)
  const benefitsRefs = useRef<(HTMLDivElement | null)[]>([])
  const t = useTranslations('Benefits');

  // Use useMemo to prevent recreation of benefits array on every render
  const benefits = useMemo(() => [
    {
      title: t('homeowners.title'),
      description: t('homeowners.description'),
    },
    {
      title: t('businesses.title'),
      description: t('businesses.description'),
    },
    {
      title: t('designers.title'),
      description: t('designers.description'),
    },
  ], [t]);

  // State for each animated element
  const [headerState, setHeaderState] = useState({ visible: false, out: false })
  const [benefitsStates, setBenefitsStates] = useState(
    benefits.map(() => ({ visible: false, out: false }))
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
      
      setHeaderState(getState(headerRef))
      
      // Update states for each benefit item
      const newBenefitsStates = benefits.map((_, index) => {
        const ref = benefitsRefs.current[index]
        if (!ref) return { visible: false, out: false }
        return getState({ current: ref })
      })
      setBenefitsStates(newBenefitsStates)
    }
    
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [benefits])

  // Listen for navigation events
  useEffect(() => {
    function onNavActivate(e: any) {
      if (e.detail?.sectionId === "benefits") {
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
      id="benefits" 
      ref={sectionRef} 
      className="py-20 bg-gray-50 dark:bg-gray-800 px-6"
    >
      <div className="max-w-6xl mx-auto">
        <motion.h2
          ref={headerRef}
          initial={{ opacity: 0, y: 40 }}
          animate={getAnim(headerState, forceIntro)}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-4xl md:text-5xl font-light text-center text-gray-900 dark:text-white mb-16"
        >
          {t('title')}
        </motion.h2>

        <div className="space-y-12">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              ref={(el: HTMLDivElement | null) => { benefitsRefs.current[index] = el; }}
              initial={{ opacity: 0, y: 40 }}
              animate={getAnim(benefitsStates[index], forceIntro)}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="bg-white dark:bg-gray-700 p-8 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm"
            >
              <h3 className="text-2xl font-light text-gray-900 dark:text-white mb-4">
                {benefit.title}
              </h3>
              <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
