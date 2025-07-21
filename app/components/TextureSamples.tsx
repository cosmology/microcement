"use client"

import { motion } from "framer-motion"
import { useRef, useEffect, useState, useMemo } from "react"
import Image from "next/image"
import { useTranslations } from 'next-intl';

export default function TextureSamples() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLHeadingElement>(null)
  const subheaderRef = useRef<HTMLParagraphElement>(null)
  const texturesRefs = useRef<(HTMLDivElement | null)[]>([])
  const ctaRef = useRef<HTMLDivElement>(null)
  const t = useTranslations('Textures');

  // Use useMemo to prevent recreation of textures array on every render
  const textures = useMemo(() => [
    {
      name: t('smooth.name'),
      description: t('smooth.description'),
      image: "/images/placeholder.svg?height=300&width=300",
      color: t('smooth.color'),
    },
    {
      name: t('fine.name'),
      description: t('fine.description'),
      image: "/images/placeholder.svg?height=300&width=300",
      color: t('fine.color'),
    },
    {
      name: t('medium.name'),
      description: t('medium.description'),
      image: "/images/placeholder.svg?height=300&width=300",
      color: t('medium.color'),
    },
    {
      name: t('rustic.name'),
      description: t('rustic.description'),
      image: "/images/placeholder.svg?height=300&width=300",
      color: t('rustic.color'),
    },
    {
      name: t('polished.name'),
      description: t('polished.description'),
      image: "/images/placeholder.svg?height=300&width=300",
      color: t('polished.color'),
    },
    {
      name: t('matte.name'),
      description: t('matte.description'),
      image: "/images/placeholder.svg?height=300&width=300",
      color: t('matte.color'),
    },
  ], [t]);

  // State for each animated element
  const [headerState, setHeaderState] = useState({ visible: false, out: false })
  const [subheaderState, setSubheaderState] = useState({ visible: false, out: false })
  const [texturesStates, setTexturesStates] = useState(
    textures.map(() => ({ visible: false, out: false }))
  )
  const [ctaState, setCtaState] = useState({ visible: false, out: false })

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
      
      // Update states for each texture item
      const newTexturesStates = textures.map((_, index) => {
        const ref = texturesRefs.current[index]
        if (!ref) return { visible: false, out: false }
        return getState({ current: ref })
      })
      setTexturesStates(newTexturesStates)
      
      setCtaState(getState(ctaRef))
    }
    
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [textures])

  // Animation helper
  function getAnim(state: { visible: boolean; out: boolean }) {
    return {
      opacity: state.visible && !state.out ? 1 : 0,
      y: state.out ? -40 : state.visible ? 0 : 40,
    }
  }

  return (
    <section id="textures" ref={sectionRef} className="py-20 bg-gray-100 dark:bg-gray-800 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.h2
          ref={headerRef}
          initial={{ opacity: 0, y: 40 }}
          animate={getAnim(headerState)}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-4xl md:text-5xl font-light text-center text-gray-900 dark:text-white mb-4"
        >
          {t('title')}
        </motion.h2>

        <motion.p
          ref={subheaderRef}
          initial={{ opacity: 0, y: 40 }}
          animate={getAnim(subheaderState)}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-xl text-center text-gray-600 dark:text-gray-300 mb-16 max-w-3xl mx-auto"
        >
          {t('subtitle')}
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {textures.map((texture, index) => (
            <motion.div
              key={texture.name}
              ref={el => (texturesRefs.current[index] = el)}
              initial={{ opacity: 0, y: 40 }}
              animate={getAnim(texturesStates[index])}
              transition={{ duration: 0.7, ease: "easeOut" }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="bg-white dark:bg-gray-700 rounded-lg overflow-hidden shadow-lg group border border-gray-200 dark:border-gray-600"
            >
              <div className="relative overflow-hidden">
                <Image
                  src={texture.image || "/placeholder.svg"}
                  alt={texture.name}
                  width={300}
                  height={300}
                  className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute top-4 right-4 bg-white dark:bg-gray-600 bg-opacity-90 dark:bg-opacity-90 px-3 py-1 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300">
                  {texture.color}
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{texture.name}</h3>
                <p className="text-gray-600 dark:text-gray-300">{texture.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          ref={ctaRef}
          initial={{ opacity: 0, y: 40 }}
          animate={getAnim(ctaState)}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center mt-12"
        >
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
            {t('cta.description')}
          </p>
          <button className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors duration-200">
            {t('cta.button')}
          </button>
        </motion.div>
      </div>
    </section>
  )
}
