"use client"

import { motion } from "framer-motion"
import { useRef, useEffect, useState, useMemo } from "react"
import Image from "next/image"
import { useTranslations } from 'next-intl';

export default function SpeedSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLHeadingElement>(null)
  const subheaderRef = useRef<HTMLDivElement>(null)
  const leftContentRef = useRef<HTMLDivElement>(null)
  const rightContentRef = useRef<HTMLDivElement>(null)
  const processRefs = useRef<(HTMLDivElement | null)[]>([])
  const t = useTranslations('Speed');

  // Use useMemo to prevent recreation of processSteps array on every render
  const processSteps = useMemo(() => [
    {
      id: "prep",
      title: t('step1.title'),
      image: "/microcement/images/process/prep.png",
      description: t('step1.description'),
      imageAlt: "Surface preparation process for micro-cement application"
    },
    {
      id: "primer",
      title: t('step2.title'),
      image: "/microcement/images/process/primer.png",
      description: t('step2.description'),
      imageAlt: "Primer application for micro-cement bonding"
    },
    {
      id: "microcement",
      title: t('step3.title'),
      image: "/microcement/images/process/microcement.png",
      description: t('step3.description'),
      imageAlt: "Micro-cement application process"
    },
    {
      id: "sealer",
      title: t('step4.title'),
      image: "/microcement/images/process/sealer.png",
      description: t('step4.description'),
      imageAlt: "Sealer application for micro-cement protection"
    }
  ], [t]);

  // State for each animated element
  const [headerState, setHeaderState] = useState({ visible: false })
  const [subheaderState, setSubheaderState] = useState({ visible: false })
  const [leftContentState, setLeftContentState] = useState({ visible: false })
  const [rightContentState, setRightContentState] = useState({ visible: false })
  const [processStates, setProcessStates] = useState(
    processSteps.map(() => ({ visible: false }))
  )

  useEffect(() => {
    function onScroll() {
      // Helper for each element
      function getState(ref: React.RefObject<HTMLElement>) {
        if (!ref.current) return { visible: false }
        const rect = ref.current.getBoundingClientRect()
        return {
          visible: rect.top < window.innerHeight * 0.8,
        }
      }
      
      setHeaderState(getState(headerRef))
      setSubheaderState(getState(subheaderRef))
      setLeftContentState(getState(leftContentRef))
      setRightContentState(getState(rightContentRef))
      
      // Update states for each process step
      const newProcessStates = processSteps.map((_, index) => {
        const ref = processRefs.current[index]
        if (!ref) return { visible: false }
        return getState({ current: ref })
      })
      setProcessStates(newProcessStates)
    }
    
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [processSteps])

  // Animation helper - removed fade away effect
  function getAnim(state: { visible: boolean }) {
    return {
      opacity: state.visible ? 1 : 0,
      y: state.visible ? 0 : 40,
    }
  }

  return (
    <section id="speed" ref={sectionRef} className="py-20 bg-light-light dark:bg-gray-900 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          ref={headerRef}
          initial={{ opacity: 0, y: 40 }}
          animate={getAnim(headerState)}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-4xl md:text-5xl font-light text-center mb-12 dark:text-white"
        >
          {t('title')}
        </motion.h2>

        <motion.div
          ref={subheaderRef}
          initial={{ opacity: 0, y: 40 }}
          animate={getAnim(subheaderState)}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
          className="flex flex-col md:flex-row justify-center items-center mb-12 space-y-4 md:space-y-0 md:space-x-8"
        >
          <h3 className="text-2xl md:text-3xl font-light text-light-dark dark:text-gray-200">
            {t('installationTitle')}
          </h3>
          <h3 className="text-2xl md:text-3xl font-light text-light-dark dark:text-gray-200">
            {t('disruptionTitle')}
          </h3>
        </motion.div>

        {/* Original Two Paragraphs */}
        <div className="grid md:grid-cols-2 gap-12 mb-16">
          <motion.div
            ref={leftContentRef}
            initial={{ opacity: 0, y: 50 }}
            animate={getAnim(leftContentState)}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.4 }}
            className="space-y-6"
          >
            <p className="text-lg text-light-dark dark:text-gray-300 leading-relaxed">
              {t('step1.description')}
            </p>
          </motion.div>

          <motion.div
            ref={rightContentRef}
            initial={{ opacity: 0, y: 50 }}
            animate={getAnim(rightContentState)}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.6 }}
            className="space-y-6"
          >
            <h4 className="text-xl font-semibold text-light-dark dark:text-white">
              {t('step2.title')}
            </h4>
            <p className="text-lg text-light-dark dark:text-gray-300 leading-relaxed">
              {t('step2.description')}
            </p>
          </motion.div>
        </div>

        {/* Process Steps with Left-Aligned Title and Image/Copy Layout */}
        <div className="space-y-16">
          {processSteps.map((step, index) => (
            <motion.div
              key={step.id}
              ref={el => (processRefs.current[index] = el)}
              initial={{ opacity: 0, y: 50 }}
              animate={getAnim(processStates[index])}
              transition={{ duration: 0.7, ease: "easeOut", delay: index * 0.1 }}
              className="space-y-8"
            >
              {/* Left-Aligned Title */}
              <div>
                <h4 className="text-xl md:text-2xl font-light text-light-dark dark:text-white">
                  {step.title}
                </h4>
                <hr className="hr-divider" />
              </div>
              

              {/* Image and Content Layout with Word-style Text Wrapping */}
              <div className="relative">
                {/* Image - positioned with text wrapping */}
                <div className="float-left mr-8 mb-4" style={{ shapeOutside: 'margin-box' }}>
                  <div className="w-[120px] h-[180px] lg:w-[200px] lg:h-[300px] rounded-lg overflow-hidden border border-light-dark dark:border-gray-700">
                    <Image
                      src={step.image}
                      alt={step.imageAlt}
                      width={200}
                      height={300}
                      className="object-cover w-full h-full"
                    />
                  </div>
                </div>

                {/* Content - flows around the image like Word document */}
                <div>
                  <p className="text-base md:text-lg text-light-dark dark:text-gray-300 leading-relaxed">
                    {step.description}
                  </p>
                </div>
                
                {/* Clear float to prevent layout issues */}
                <div className="clear-both"></div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
