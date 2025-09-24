"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { paths } from "@/lib/config"
import { usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { GeoLocationSection } from "./GeoLocationSection";
import LocaleSwitcherSelect from "./LocaleSwitcherSelect"
import UserProfile from "./UserProfile"
import { ThemeToggle } from "@/components/theme-toggle"

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'sr', label: 'Srpski' },
];

// Navigation links will be created dynamically using translations

export default function NavigationSection({ user, onUserChange }: { user?: any, onUserChange?: (user: any) => void }) {
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

  // Create navigation links dynamically using translations
  const galleryDropdown = [
    { name: t('beforeAfter'), href: "#before-after" },
    { name: t('featured'), href: "#featured" },
    { name: t('textures'), href: "#textures" },
    { name: t('upload'), href: paths.uploadPage },
  ]

  const navLinks = [
    { name: t('ecoFriendly'), href: "#environmental" },
    { name: t('speed'), href: "#speed" },
    {
      name: t('gallery'),
      dropdown: galleryDropdown,
    },
    { name: t('benefits'), href: "#benefits" },
    { name: t('luxury'), href: "#luxury" },
  ]

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
          className="fixed top-0 left-0 right-0 z-[1003] w-full bg-light-light dark:bg-gray-900 border-b border-light-dark/30 dark:border-gray-700/30 backdrop-blur-md"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between h-12 sm:h-14 md:h-16 px-8 py-10 relative">
            {/* Left side - Hamburger menu and Logo */}
            <div className="flex items-center gap-2">
              {/* Morphing Hamburger/X for mobile */}
              <button
                className="md:hidden flex items-center justify-center p-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-light-dark relative"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
              >
                <motion.svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6 sm:w-7 sm:h-7 text-light-dark dark:text-white"
                >
                  {/* Top line - fades out */}
                  <motion.line
                    x1="3" y1="7" x2="21" y2="7"
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
                    x1="3" y1="12" x2="21" y2="12"
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
                  {/* Bottom line - fades out */}
                  <motion.line
                    x1="3" y1="17" x2="21" y2="17"
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
                  {/* X lines - fade in */}
                  <motion.line
                    x1="6" y1="6" x2="18" y2="18"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                    initial={false}
                    animate={mobileOpen ? {
                      opacity: 1,
                      transition: { duration: 0.3, ease: "easeOut", delay: 0.2 }
                    } : {
                      opacity: 0,
                      transition: { duration: 0.2, ease: "easeOut", delay: 0.1 }
                    }}
                  />
                  <motion.line
                    x1="18" y1="6" x2="6" y2="18"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                    initial={false}
                    animate={mobileOpen ? {
                      opacity: 1,
                      transition: { duration: 0.3, ease: "easeOut", delay: 0.2 }
                    } : {
                      opacity: 0,
                      transition: { duration: 0.2, ease: "easeOut", delay: 0.1 }
                    }}
                  />
                </motion.svg>
              </button>

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
            </div>
            
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
              {/* Language Dropdown */}
              <LocaleSwitcherSelect
                defaultValue={locale}
                label="Select Language"/>
              {/* Theme Toggle */}
              <div className="flex-shrink-0">
                <ThemeToggle />
              </div>
              {/* User Profile */}
              <div className="flex-shrink-0">
                <UserProfile onUserChange={onUserChange} />
              </div>
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