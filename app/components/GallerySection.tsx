"use client"

import { motion } from "framer-motion"
import { useRef, useEffect, useState, useMemo } from "react"
import Image from "next/image"
import { useTranslations } from 'next-intl';

export default function GallerySection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const elementsRefs = useRef<(HTMLDivElement | null)[]>([])
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedImage, setSelectedImage] = useState<any>(null)
  const t = useTranslations('Gallery');

  // Use useMemo to prevent recreation of arrays on every render
  const galleryItems = useMemo(() => [
    {
      id: 1,
      title: t('items.kitchen.title'),
      category: t('categories.kitchen'),
      image: "/images/gallery/kitchen-countertops.png",
      description: t('items.kitchen.description'),
    },
    {
      id: 2,
      title: t('items.bathroom.title'),
      category: t('categories.bathroom'),
      image: "/images/gallery/bathroom-walls.png",
      description: t('items.bathroom.description'),
    },
    {
      id: 3,
      title: t('items.living.title'),
      category: t('categories.livingSpace'),
      image: "/images/gallery/living-room-floor.png",
      description: t('items.living.description'),
    },
    {
      id: 4,
      title: t('items.retail.title'),
      category: t('categories.commercial'),
      image: "/images/gallery/retail-wall.png",
      description: t('items.retail.description'),
    },
    {
      id: 5,
      title: t('items.restaurant.title'),
      category: t('categories.commercial'),
      image: "/images/gallery/restaurant-bar.png",
      description: t('items.restaurant.description'),
    },
    {
      id: 6,
      title: t('items.staircase.title'),
      category: t('categories.architectural'),
      image: "/images/gallery/staircase.png",
      description: t('items.staircase.description'),
    },
    {
      id: 7,
      title: t('items.patio.title'),
      category: t('categories.exterior'),
      image: "/images/gallery/outdoor-patio.png",
      description: t('items.patio.description'),
    },
    {
      id: 8,
      title: t('items.furniture.title'),
      category: t('categories.furniture'),
      image: "/images/gallery/custom-furniture.png",
      description: t('items.furniture.description'),
    },
  ], [t]);

  const categories = useMemo(() => [
    t('categories.all'),
    t('categories.kitchen'),
    t('categories.bathroom'),
    t('categories.livingSpace'),
    t('categories.commercial'),
    t('categories.architectural'),
    t('categories.exterior'),
    t('categories.furniture'),
  ], [t]);

  const galleryElements = useMemo(() => [
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
      className: "text-xl text-center text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto"
    }
  ], [t]);

  // State for each animated element
  const [elementsStates, setElementsStates] = useState(
    galleryElements.map(() => ({ visible: false, out: false }))
  )
  
  // Force intro state for navigation triggers
  const [forceIntro, setForceIntro] = useState(false)

  const filteredItems =
    selectedCategory === t('categories.all') ? galleryItems : galleryItems.filter((item) => item.category === selectedCategory)

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
      const newElementsStates = galleryElements.map((_, index) => {
        const ref = elementsRefs.current[index]
        if (!ref) return { visible: false, out: false }
        return getState({ current: ref })
      })
      setElementsStates(newElementsStates)
    }
    
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [galleryElements])

  // Listen for navigation events
  useEffect(() => {
    function onNavActivate(e: any) {
      if (e.detail?.sectionId === "gallery") {
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
    <section id="gallery" ref={sectionRef} className="py-20 bg-gray-50 dark:bg-gray-800 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Elements with scroll-driven animation */}
        {galleryElements.map((element, index) => {
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

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-2 rounded-full font-medium transition-all duration-300 ${
                selectedCategory === category
                  ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg"
                  : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Gallery Grid */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item, index) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="bg-white dark:bg-gray-700 rounded-lg overflow-hidden shadow-lg cursor-pointer group border border-gray-200 dark:border-gray-600"
              onClick={() => setSelectedImage(item)}
            >
              <div className="relative overflow-hidden">
                <Image
                  src={item.image || "/placeholder.svg"}
                  alt={item.title}
                  width={600}
                  height={400}
                  className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-110"
                  priority={index < 4} // Prioritize loading for first 4 images
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ opacity: 1, scale: 1 }}
                    className="text-white font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  >
                    {t('viewDetails')}
                  </motion.div>
                </div>
              </div>
              <div className="p-6">
                <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-sm rounded-full mb-3">
                  {item.category}
                </span>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Modal for enlarged image */}
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <Image
                  src={selectedImage.image || "/placeholder.svg"}
                  alt={selectedImage.title}
                  width={800}
                  height={600}
                  className="w-full h-auto max-h-[60vh] object-cover"
                />
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-4 right-4 bg-white dark:bg-gray-700 bg-opacity-90 hover:bg-opacity-100 rounded-full p-2 transition-all duration-200 text-gray-900 dark:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{selectedImage.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">{selectedImage.description}</p>
                <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-sm rounded-full">
                  {selectedImage.category}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </section>
  )
}
