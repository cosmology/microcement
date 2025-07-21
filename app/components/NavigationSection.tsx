"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ThemeToggle } from "@/components/theme-toggle"
import Image from "next/image"
import { paths } from "@/lib/config"
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'sr', label: 'Srpski' },
];

const galleryDropdown = [
  { name: "Before & After", href: "#before-after" },
  { name: "Featured", href: "#featured" },
  { name: "Textures", href: "#textures" },
  { name: "Upload", href: paths.uploadPage }, // Use centralized config
]

const navLinks = [
  { name: "Eco Friendly", href: "#environmental" },
  { name: "Speed", href: "#speed" },
  { name: "Seamless Finishes", href: "#seamless" },
  {
    name: "Gallery",
    dropdown: galleryDropdown,
  },
  { name: "Benefits", href: "#benefits" },
  { name: "Luxury", href: "#luxury" },
]

export default function NavigationSection() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [showNav, setShowNav] = useState(false) // Start hidden
  const [navVisible, setNavVisible] = useState(false) // Start hidden
  const lastScrollY = useRef(0)
  const animating = useRef(false)
  const pathname = usePathname();
  const [langOpen, setLangOpen] = useState(false);
  const locale = useLocale();
  const t = useTranslations('Navigation');
  
  const currentLang = LANGUAGES.find(l => l.code === locale) || LANGUAGES[0];
  const otherLangs = LANGUAGES.filter(l => l.code !== locale);

  // Hide nav on scroll down, show on scroll up, and ensure animation completes
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY < 100) {
        // Hide nav when on HeroSection (top of page)
        setShowNav(false)
        setNavVisible(false)
      } else if (currentScrollY > lastScrollY.current) {
        setShowNav(false)
        setNavVisible(false)
      } else {
        setShowNav(true)
        setNavVisible(true)
      }
      lastScrollY.current = currentScrollY
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Close mobile menu on navigation
  const handleNavClick = () => {
    setMobileOpen(false)
    setOpenDropdown(null)
  }

  // Dropdown logic for desktop
  const handleDropdown = (name: string) => {
    setOpenDropdown(openDropdown === name ? null : name)
  }

  // Responsive font size
  const navFont = "text-nav-xs sm:text-nav-sm md:text-nav-base lg:text-nav-lg"

  // Framer Motion variants for smooth slide/fade
  const navVariants = {
    hidden: { y: -80, opacity: 0, transition: { duration: 0.25, ease: "easeOut" } },
    visible: { y: 0, opacity: 1, transition: { duration: 0.25, ease: "easeOut" } },
  }

  return (
    <AnimatePresence>
      {showNav && (
        <motion.nav
          key="main-nav"
          initial="hidden"
          animate={navVisible ? "visible" : "hidden"}
          exit="hidden"
          variants={navVariants}
          className="fixed top-0 left-0 right-0 z-50 w-full bg-light-light dark:bg-gray-900 border-b border-light-dark dark:border-gray-700 backdrop-blur-md"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between h-12 sm:h-14 md:h-16 px-2 sm:px-4 md:px-8">
            {/* Logo or Brand */}
            <a href="#" className={`font-bold ${navFont} text-light-dark dark:text-white`}>
              <Image
                src="/images/logo-horizontal.jpg"
                alt="Microcement"
                width={120}
                height={50}
                className="hidden sm:block h-8 w-auto"
              />
              <Image
                src="/images/logo.jpg"
                alt="Microcement"
                width={80}
                height={80}
                className="block sm:hidden h-8 w-auto"
              />
            </a>
            {/* Desktop Nav */}
            <ul className={`hidden md:flex items-center gap-2 sm:gap-4 md:gap-6 ${navFont}`}>
              {navLinks.map((link) =>
                link.dropdown ? (
                  <li key={link.name} className="relative">
                    <button
                      className="flex items-center gap-1 font-medium text-light-dark dark:text-white bg-transparent border-none outline-none cursor-pointer py-2 px-3 rounded hover:bg-light-main dark:hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-light-dark"
                      onClick={() => handleDropdown(link.name)}
                      onBlur={() => setTimeout(() => setOpenDropdown(null), 150)}
                      aria-haspopup="true"
                      aria-expanded={openDropdown === link.name}
                    >
                      {link.name}
                      <svg className="ml-1 w-3 h-3 inline" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <AnimatePresence>
                      {openDropdown === link.name && (
                        <motion.ul
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="absolute left-0 mt-2 min-w-[160px] bg-light-light dark:bg-gray-800 rounded shadow-lg border border-light-dark dark:border-gray-700 z-50"
                        >
                          {link.dropdown.map((item) => (
                            <li key={item.name}>
                              <a
                                href={item.href}
                                className="block px-4 py-2 text-light-dark dark:text-white hover:bg-light-main dark:hover:bg-gray-700 rounded transition-colors"
                                onClick={handleNavClick}
                              >
                                {item.name}
                              </a>
                            </li>
                          ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </li>
                ) : (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="font-medium text-light-dark dark:text-white bg-transparent border-none outline-none cursor-pointer py-2 px-3 rounded hover:bg-light-main dark:hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-light-dark"
                      onClick={handleNavClick}
                    >
                      {link.name}
                    </a>
                  </li>
                )
              )}
            </ul>
            {/* Right side controls - Theme Toggle, Hamburger, and Language Toggle */}
            <div className="flex items-center gap-2">
                            {/* Language Dropdown */}
                            <div className="relative">
                <button
                  className="px-2 py-1 rounded border border-light-dark dark:border-gray-700 bg-white dark:bg-gray-800 text-light-dark dark:text-white hover:bg-light-main dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
                  onClick={() => setLangOpen(v => !v)}
                  aria-haspopup="listbox"
                  aria-expanded={langOpen}
                >
                  {currentLang.label}
                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" /></svg>
                </button>
                {langOpen && (
                  <ul className="absolute right-0 mt-2 min-w-[120px] bg-white dark:bg-gray-800 rounded shadow-lg border border-light-dark dark:border-gray-700 z-50" role="listbox">
                    {otherLangs.map(lang => (
                      <li key={lang.code}>
                        <Link
                          href={`/${lang.code}`}
                          className="block px-4 py-2 text-light-dark dark:text-white hover:bg-light-main dark:hover:bg-gray-700 rounded transition-colors"
                          onClick={() => setLangOpen(false)}
                          role="option"
                          aria-selected={false}
                        >
                          {lang.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {/* Theme Toggle */}
              <div className="flex-shrink-0">
                <ThemeToggle />
              </div>
              {/* Morphing Hamburger/X for mobile */}
              <button
                className="md:hidden flex items-center justify-center p-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-light-dark"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
              >
                <motion.svg
                  width="28"
                  height="28"
                  viewBox="0 0 28 28"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-7 h-7 text-light-dark dark:text-white"
                >
                  {/* Top line */}
                  <motion.line
                    x1="5" y1="8" x2="23" y2="8"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                    initial={false}
                    animate={mobileOpen ? {
                      y1: 20, y2: 20, rotate: 45
                    } : {
                      y1: 8, y2: 8, rotate: 0
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    style={{ originX: 0.5, originY: 0.5 }}
                  />
                  {/* Middle line */}
                  <motion.line
                    x1="5" y1="14" x2="23" y2="14"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                    initial={false}
                    animate={mobileOpen ? {
                      opacity: 0,
                      x1: 14, x2: 14
                    } : {
                      opacity: 1,
                      x1: 5, x2: 23
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                  {/* Bottom line */}
                  <motion.line
                    x1="5" y1="20" x2="23" y2="20"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                    initial={false}
                    animate={mobileOpen ? {
                      y1: 8, y2: 8, rotate: -45
                    } : {
                      y1: 20, y2: 20, rotate: 0
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    style={{ originX: 0.5, originY: 0.5 }}
                  />
                </motion.svg>
              </button>
            </div>
          </div>
          {/* Mobile Menu */}
          <AnimatePresence>
            {mobileOpen && (
              <motion.div
                initial={{ y: -40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -40, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="md:hidden bg-light-light dark:bg-gray-900 border-t border-light-dark dark:border-gray-700 px-4 py-4"
              >
                <ul className="flex flex-col gap-2">
                  {navLinks.map((link) =>
                    link.dropdown ? (
                      <li key={link.name} className="relative">
                        <button
                          className="w-full flex items-center justify-between font-medium text-light-dark dark:text-white bg-transparent border-none outline-none cursor-pointer py-2 px-3 rounded hover:bg-light-main dark:hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-light-dark"
                          onClick={() => handleDropdown(link.name)}
                          aria-haspopup="true"
                          aria-expanded={openDropdown === link.name}
                        >
                          {link.name}
                          <svg className="ml-1 w-3 h-3 inline" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <AnimatePresence>
                          {openDropdown === link.name && (
                            <motion.ul
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                              className="pl-4"
                            >
                              {link.dropdown.map((item) => (
                                <li key={item.name}>
                                  <a
                                    href={item.href}
                                    className="block px-4 py-2 text-light-dark dark:text-white hover:bg-light-main dark:hover:bg-gray-700 rounded transition-colors"
                                    onClick={handleNavClick}
                                  >
                                    {item.name}
                                  </a>
                                </li>
                              ))}
                            </motion.ul>
                          )}
                        </AnimatePresence>
                      </li>
                    ) : (
                      <li key={link.name}>
                        <a
                          href={link.href}
                          className="block font-medium text-light-dark dark:text-white bg-transparent border-none outline-none cursor-pointer py-2 px-3 rounded hover:bg-light-main dark:hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-light-dark"
                          onClick={handleNavClick}
                        >
                          {link.name}
                        </a>
                      </li>
                    )
                  )}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.nav>
      )}
    </AnimatePresence>
  )
} 