"use client"

import { useEffect, useState } from "react"
import { useScroll } from "framer-motion"
import StickyNav from "./components/StickyNav"
import HeroSection from "./components/HeroSection"
import BeforeAndAfterSection from "./components/BeforeAndAfterSection"
import EnvironmentalSection from "./components/EnvironmentalSection"
import ComparisonSection from "./components/ComparisonSection"
import GallerySection from "./components/GallerySection"
import FeaturedShowcase from "./components/FeaturedShowcase"
import TextureSamples from "./components/TextureSamples"
import LuxurySection from "./components/LuxurySection"
import SpeedSection from "./components/SpeedSection"
import BenefitsSection from "./components/BenefitsSection"
import CTASection from "./components/CTASection"
import NavigationSection from "./components/NavigationSection"

export default function Home() {
  const { scrollYProgress } = useScroll()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="relative">
      <NavigationSection />
      <main className="relative">
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
