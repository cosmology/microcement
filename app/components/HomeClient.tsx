"use client";

import { useEffect, useState } from "react"
import { useTranslations } from 'next-intl';
import HeroSection from "./HeroSection"
import Preloader from "./Preloader"
import BeforeAndAfterSection from "./BeforeAndAfterSection"
import EnvironmentalSection from "./EnvironmentalSection"
import ComparisonSection from "./ComparisonSection"
import GallerySection from "./GallerySection"
import FeaturedShowcase from "./FeaturedShowcase"
import TextureSamples from "./TextureSamples"
import LuxurySection from "./LuxurySection"
import SpeedSection from "./SpeedSection"
import BenefitsSection from "./BenefitsSection"
import CTASection from "./CTASection"
import NavigationSection from "./NavigationSection"
import { usePathname } from 'next/navigation';

export default function HomeClient() {
//   const { scrollYProgress } = useScroll()
  const [mounted, setMounted] = useState(false)
  const [preloadDone, setPreloadDone] = useState(false)
  const t = useTranslations('Index');

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  // Helper to build locale switch links for static export
//   function getLocaleHref(langCode: string) {
//     // Remove the current locale from the pathname (assumes /[locale]/...)
//     const rest = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '');
//     return `/${langCode}${rest === '' ? '/' : rest}`;
//   }

//   const pathname = usePathname() || '/';
//   const locale = pathname.split('/')[1]; // 'en', 'es', 'sr'

  return (
    <div className="relative">
      {!preloadDone && <Preloader onComplete={() => setPreloadDone(true)} />}
      <NavigationSection />
      <main className="relative" style={{ visibility: preloadDone ? 'visible' : 'hidden' }}>
        <HeroSection />
        <EnvironmentalSection />
        <ComparisonSection />
        <SpeedSection />
        <GallerySection />
        <BeforeAndAfterSection />
        <FeaturedShowcase />
        <TextureSamples />
        <LuxurySection />
        <BenefitsSection />
        <CTASection />
      </main>
    </div>
  )
} 