"use client"

import { motion } from "framer-motion"
import { useRef, useEffect, useState, useMemo } from "react"
import Image from "next/image"
import { useTranslations } from 'next-intl';

export default function FeaturedShowcase() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const elementsRefs = useRef<(HTMLDivElement | null)[]>([])
  const projectsRefs = useRef<(HTMLDivElement | null)[]>([])
  const t = useTranslations('Featured');
  
  // Use useMemo to prevent recreation of arrays on every render
  const featuredProjects = useMemo(() => [
    {
      id: 1,
      title: t('projects.salon.title'),
      location: t('projects.salon.location'),
      image: "/images/featured/west-hollywood-sunset-hair-salon.png",
      description: t('projects.salon.description'),
      features: [t('features.quickInstallation'), t('features.durableFinish'), t('features.topcreteGallery'), t('features.ecoFriendly'), t('features.ecoCemento')],
    },
    {
      id: 2,
      title: t('projects.bathroom.title'),
      location: t('projects.bathroom.location'),
      image: "/images/gallery/b&a/bath_after.jpg",
      description: t('projects.bathroom.description'),
      features: [t('features.quickInstallation'), t('features.customColor'), t('features.ecoFriendly')],
    },
    {
      id: 3,
      title: t('projects.home.title'),
      location: t('projects.home.location'),
      image: "https://www.idealwork.com/wp-content/uploads/2017/08/slider_Appartamento_Belgio_MT1.jpg",
      description: t('projects.home.description'),
      features: [t('features.waterproof'), t('features.easyMaintenance'), t('features.customTextures'), t('features.ecoFriendly')],
    },
  ], [t]);

  const showcaseElements = useMemo(() => [
    {
      id: "header",
      type: "h2",
      content: t('title'),
      className: "text-4xl md:text-5xl font-light text-center text-gray-900 dark:text-white mb-4"
    },
    {
      id: "subheader",
      type: "p", 
      content: t('subtitle'),
      className: "text-xl text-center text-gray-600 dark:text-gray-300 mb-16 max-w-3xl mx-auto"
    }
  ], [t]);
  
  // State for each animated element
  const [elementsStates, setElementsStates] = useState(
    showcaseElements.map(() => ({ visible: false, out: false }))
  )
  const [projectsStates, setProjectsStates] = useState(
    featuredProjects.map(() => ({ visible: false, out: false }))
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
      
      // Update states for header elements
      const newElementsStates = showcaseElements.map((_, index) => {
        const ref = elementsRefs.current[index]
        if (!ref) return { visible: false, out: false }
        return getState({ current: ref })
      })
      setElementsStates(newElementsStates)
      
      // Update states for project items - FIXED: Only animate in, don't fade out
      const newProjectsStates = featuredProjects.map((_, index) => {
        const ref = projectsRefs.current[index]
        if (!ref) return { visible: false, out: false }
        const rect = ref.getBoundingClientRect()
        return {
          visible: rect.top < window.innerHeight * 0.8,
          out: false // Never fade out project items
        }
      })
      setProjectsStates(newProjectsStates)
    }
    
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [showcaseElements, featuredProjects])

  // Listen for navigation events
  useEffect(() => {
    function onNavActivate(e: any) {
      if (e.detail?.sectionId === "featured") {
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

  // Special animation for project items - only fade in, never out
  function getProjectAnim(state: { visible: boolean; out: boolean }, force = false) {
    if (force) {
      return { opacity: 1, y: 0 }
    }
    return {
      opacity: state.visible ? 1 : 0,
      y: state.visible ? 0 : 50,
    }
  }

  return (
    <section 
      id="featured"
      ref={sectionRef} 
      className="py-20 bg-white dark:bg-gray-900 px-6"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header Elements with scroll-driven animation */}
        {showcaseElements.map((element, index) => {
          const ElementType = element.type as keyof JSX.IntrinsicElements
          
          return (
            <motion.div
              key={element.id}
              ref={el => { elementsRefs.current[index] = el; }}
              initial={{ opacity: 0, y: 40 }}
              animate={getAnim(elementsStates[index], forceIntro)}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <ElementType 
                className={element.className}
                style={element.type === "h2" ? {} : {}}
              >
                {element.content}
              </ElementType>
            </motion.div>
          )
        })}

        {/* Featured Projects with fixed animation - only fade in */}
        <div className="space-y-20">
          {featuredProjects.map((project, index) => (
            <motion.div
              key={project.id}
              ref={el => { projectsRefs.current[index] = el; }}
              initial={{ opacity: 0, y: 50 }}
              animate={getProjectAnim(projectsStates[index], forceIntro)}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              className={`flex flex-col ${index % 2 === 1 ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-12`}
            >
              <div className="lg:w-1/2">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                  className="relative overflow-hidden rounded-lg shadow-2xl"
                >
                  <Image
                    src={project.image || "/placeholder.svg"}
                    alt={project.title}
                    width={800}
                    height={600}
                    className="w-full h-auto object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </motion.div>
              </div>

              <div className="lg:w-1/2 space-y-6">
                <div>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{project.title}</h3>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">{project.location}</p>
                  <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">{project.description}</p>
                </div>

                <div>
                  <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Key Features:</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {project.features.map((feature, featureIndex) => (
                      <motion.div
                        key={featureIndex}
                        initial={{ opacity: 0, x: -20 }}
                        animate={projectsStates[index].visible ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                        transition={{ duration: 0.5, delay: index * 0.2 + featureIndex * 0.1 }}
                        className="flex items-center space-x-2"
                      >
                        <div className="w-2 h-2 bg-gray-900 dark:bg-white rounded-full" />
                        <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
