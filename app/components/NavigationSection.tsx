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
import { useUserRole } from "@/hooks/useUserRole"

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
  
  // Get user role information
  const { role, loading: userRoleLoading } = useUserRole()

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
      if (currentScrollY > lastScrollY.current && currentScrollY > 24) {
        // scrolling down
        setNavVisible(false)
      } else {
        // scrolling up
        setNavVisible(true)
      }
      lastScrollY.current = currentScrollY
      setShowNav(true)
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

  // For role-based users, show simplified navigation
  const renderRoleBasedNav = () => {
    if (role === 'end_user' || role === 'architect' || role === 'admin') {
      return (
        <motion.nav 
          id="main-navigation"
          className="fixed top-0 left-0 right-0 z-[1003] w-full bg-white dark:bg-gray-900 border-b border-light-dark/30 dark:border-gray-700/30 backdrop-blur-md"
          variants={navVariants}
          initial="visible"
          animate={navVisible ? "visible" : "hidden"}
        >
          <div className="w-full flex items-center justify-between h-12 px-2 py-1">
            {/* Logo only on left */}
            <div className="flex items-center">
              <a href="#" className="font-bold text-gray-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                <Image
                  src="/images/logo-procemento.png"
                  alt="Microcement"
                  width={30}
                  height={20}
                  style={{ 
                    filter: getLogoFilter(),
                    objectFit: 'contain'
                  }}
                  className="h-5 sm:h-6 md:h-8"
                />
              </a>
            </div>

            {/* Right side - Auth controls only */}
            <div className="flex items-center gap-2">
              <LocaleSwitcherSelect defaultValue={locale} label="" />
              <ThemeToggle />
              <UserProfile onUserChange={onUserChange} />
            </div>
          </div>
        </motion.nav>
      )
    }

    // Default navigation for guests - simplified
    return (
      <motion.nav 
        id="main-navigation"
        className="fixed top-0 left-0 right-0 z-[1003] w-full bg-white dark:bg-gray-900 border-b border-light-dark/30 dark:border-gray-700/30 backdrop-blur-md"
        variants={navVariants}
        initial="visible"
        animate={navVisible ? "visible" : "hidden"}
      >
        <div className="w-full flex items-center justify-between h-12 px-2 py-1">
          {/* Logo and Mobile Menu */}
          <div className="flex items-center">
            {/* Mobile Hamburger Menu */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden mr-3 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle menu"
            >
              <div className="w-6 h-6 flex flex-col justify-center items-center">
                <span className={`w-5 h-0.5 bg-gray-700 dark:bg-gray-200 transition-all duration-300 ${mobileOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
                <span className={`w-5 h-0.5 bg-gray-700 dark:bg-gray-200 transition-all duration-300 mt-1 ${mobileOpen ? 'opacity-0' : ''}`}></span>
                <span className={`w-5 h-0.5 bg-gray-700 dark:bg-gray-200 transition-all duration-300 mt-1 ${mobileOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
              </div>
            </button>

            {/* Logo */}
            <a href="#" className="font-bold text-gray-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
              <Image
                src="/images/logo-procemento.png"
                alt="Microcement"
                width={60}
                height={40}
                style={{ 
                  filter: getLogoFilter(),
                  objectFit: 'contain'
                }}
                className="h-5 sm:h-6 md:h-8"
              />
            </a>
          </div>

          {/* Desktop Navigation Menu Items */}
          <ul className="hidden md:flex items-center space-x-6">
            {navLinks.map((link, index) => (
              <li key={index}>
                {link.dropdown ? (
                  <div className="relative group">
                    <button className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex items-center">
                      {link.name}
                      <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <ul className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 border border-gray-200 dark:border-gray-700">
                      {link.dropdown.map((item, i) => (
                        <li key={i}>
                          <a href={item.href} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            {item.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <a href={link.href} className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                    {link.name}
                  </a>
                )}
              </li>
            ))}
          </ul>

          {/* Right side - Auth controls */}
          <div className="flex items-center gap-2">
            <LocaleSwitcherSelect defaultValue={locale} label="" />
            <ThemeToggle />
            <UserProfile onUserChange={onUserChange} />
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {mobileOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="absolute top-full left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-lg"
              >
                <ul className="py-2 space-y-1">
                  {navLinks.map((link, index) => (
                    <li key={index}>
                      {link.dropdown ? (
                        <div className="relative">
                          <button
                            onClick={() => setOpenDropdown(openDropdown === link.name ? null : link.name)}
                            className="w-full px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-between"
                          >
                            {link.name}
                            <svg
                              className={`w-4 h-4 transition-transform duration-200 ${openDropdown === link.name ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <AnimatePresence>
                            {openDropdown === link.name && (
                              <motion.ul
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-gray-50 dark:bg-gray-800"
                              >
                                {link.dropdown.map((item, i) => (
                                  <li key={i}>
                                    <a
                                      href={item.href}
                                      onClick={() => setMobileOpen(false)}
                                      className="block px-8 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                      {item.name}
                                    </a>
                                  </li>
                                ))}
                              </motion.ul>
                            )}
                          </AnimatePresence>
                        </div>
                      ) : (
                        <a
                          href={link.href}
                          onClick={() => setMobileOpen(false)}
                          className="block px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          {link.name}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.nav>
    )
  }

  return renderRoleBasedNav()
}
