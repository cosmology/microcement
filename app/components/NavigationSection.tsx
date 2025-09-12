"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ThemeToggle } from "@/components/theme-toggle"
import Image from "next/image"
import { paths } from "@/lib/config"
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { GeoLocationSection } from "./GeoLocationSection";
import LocaleSwitcherSelect from "./LocaleSwitcherSelect"

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
  const [isDark, setIsDark] = useState(false)

  // Theme detection for logo filtering
  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    
    checkTheme();
    
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  // Get logo filter based on theme
  const getLogoFilter = () => {
    if (isDark) {
      // Dark theme: make logo light/white
      return 'brightness(0) invert(1) contrast(0.9)';
    } else {
      // Light theme: make logo dark/gray
      return 'brightness(0) invert(0) contrast(1.2)';
    }
  };
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
          className="fixed top-0 left-0 right-0 z-50 w-full bg-light-light dark:bg-gray-900 border-b border-light-dark/30 dark:border-gray-700/30 backdrop-blur-md"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between h-12 sm:h-14 md:h-16 px-8 py-10">
            {/* Logo or Brand */}
            <a href="#" className={`font-bold ${navFont} text-light-dark dark:text-white`}>
              <Image
                src="/images/logo-procemento.png"
                alt="Microcement"
                width={200}
                height={105}
                className="hidden sm:block h-8 w-auto transition-all duration-200"
                style={{
                  filter: getLogoFilter(), // Dynamic theme-aware filtering
                  opacity: 0.9,
                  transition: 'filter 0.3s ease-in-out'
                }}
              />
              <Image
                src="/images/logo-procemento.png"
                alt="Microcement"
                width={200}
                height={105}
                className="block sm:hidden h-8 w-auto transition-all duration-200"
                style={{
                  filter: getLogoFilter(), // Dynamic theme-aware filtering
                  opacity: 0.9,
                  transition: 'filter 0.3s ease-in-out'
                }}
              />
            </a>
            {/* <GeoLocationSection /> */}
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
            <LocaleSwitcherSelect
              defaultValue={useLocale()}
              label="Select Language"
            />
              {/* Language Dropdown */}
              {/* <div className="relative">
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
              </div> */}
              {/* Theme Toggle */}
              <div className="flex-shrink-0">
                <ThemeToggle />
              </div>
              {/* Morphing Hamburger/X for mobile */}
              <button
                className="md:hidden flex items-center justify-center p-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-light-dark relative"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
              >
                <motion.svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-8 h-8 text-light-dark dark:text-white"
                >
                  {/* Top line - fades out */}
                  <motion.line
                    x1="3" y1="9" x2="29" y2="9"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                    initial={false}
                    animate={mobileOpen ? {
                      opacity: 0,
                      transition: { duration: 0.2, ease: "easeOut", delay: 0.1 }
                    } : {
                      opacity: 1,
                      transition: { duration: 0.3, ease: "easeOut", delay: 0.2 }
                    }}
                  />
                  {/* Middle line - fades out */}
                  <motion.line
                    x1="3" y1="16" x2="29" y2="16"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                    initial={false}
                    animate={mobileOpen ? {
                      opacity: 0,
                      transition: { duration: 0.2, ease: "easeOut", delay: 0.2 }
                    } : {
                      opacity: 1,
                      transition: { duration: 0.3, ease: "easeOut", delay: 0.1 }
                    }}
                  />
                  {/* Bottom line - fades out */}
                  <motion.line
                    x1="3" y1="23" x2="29" y2="23"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                    initial={false}
                    animate={mobileOpen ? {
                      opacity: 0,
                      transition: { duration: 0.2, ease: "easeOut", delay: 0.3 }
                    } : {
                      opacity: 1,
                      transition: { duration: 0.3, ease: "easeOut" }
                    }}
                  />
                </motion.svg>
                {/* Top diagonal line - starts at middle, rotates counter-clockwise */}
                <motion.div
                  className="absolute w-4 h-0.5 bg-light-dark dark:bg-white rounded-full"
                  style={{ 
                    top: '50%', 
                    left: '50%', 
                    transformOrigin: 'center',
                    transform: 'translate(-50%, -50%)'
                  }}
                  initial={{ opacity: 0, rotate: 0 }}
                  animate={mobileOpen ? {
                    opacity: 1,
                    rotate: -45,
                    transition: { 
                      duration: 0.4, 
                      ease: "easeOut", 
                      delay: 0.4
                    }
                  } : {
                    opacity: 0,
                    rotate: 0,
                    transition: { 
                      duration: 0.3, 
                      ease: "easeOut"
                    }
                  }}
                />
                {/* Bottom diagonal line - starts at middle, rotates clockwise */}
                <motion.div
                  className="absolute w-4 h-0.5 bg-light-dark dark:bg-white rounded-full"
                  style={{ 
                    top: '50%', 
                    left: '50%', 
                    transformOrigin: 'center',
                    transform: 'translate(-50%, -50%)'
                  }}
                  initial={{ opacity: 0, rotate: 0 }}
                  animate={mobileOpen ? {
                    opacity: 1,
                    rotate: 45,
                    transition: { 
                      duration: 0.4, 
                      ease: "easeOut", 
                      delay: 0.4
                    }
                  } : {
                    opacity: 0,
                    rotate: 0,
                    transition: { 
                      duration: 0.3, 
                      ease: "easeOut"
                    }
                  }}
                />
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