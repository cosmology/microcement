"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ThemeToggle } from "@/components/theme-toggle"

const navItems = [
  { name: "Eco Friendly", href: "#environmental", sectionId: "environmental" },
  { name: "Sleek", href: "#comparison", sectionId: "comparison" },
  { name: "Speed", href: "#speed", sectionId: "speed" },
  { name: "Gallery", href: "#gallery", sectionId: "gallery" },
  { name: "Featured", href: "#featured", sectionId: "featured" },
  { name: "Before/After", href: "#before-and-after", sectionId: "before-and-after" },
  { name: "Textures", href: "#textures", sectionId: "texturesr" },
  { name: "Benefits", href: "#benefits", sectionId: "benefits" },
]

export default function StickyNav() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 100)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToSection = (href: string, sectionId?: string) => {
    const element = document.querySelector(href)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
      if (sectionId) {
        window.dispatchEvent(new CustomEvent("section-nav-activate", { 
          detail: { sectionId } 
        }))
      }
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.nav
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 transition-colors duration-200"
        >
          <div className="container mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              {/* Navigation Items */}
              <div className="flex justify-center space-x-8 flex-1">
                {navItems.map((item, index) => (
                  <motion.button
                    key={item.name}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    onClick={() => scrollToSection(item.href, item.sectionId)}
                    className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors duration-200"
                  >
                    {item.name}
                  </motion.button>
                ))}
              </div>
              
              {/* Theme Toggle Button */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.5 }}
                className="flex items-center"
              >
                <ThemeToggle />
              </motion.div>
            </div>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  )
}
