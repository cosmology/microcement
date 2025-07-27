"use client";

import { useEffect, useRef, useState } from "react"
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
import dynamic from "next/dynamic";

const ScrollScene = dynamic(() => import("./ScrollScene"), { ssr: false });

export default function HomeClient() {
  const [mounted, setMounted] = useState(false)
  const [preloadDone, setPreloadDone] = useState(false)
  const [sceneStage, setSceneStage] = useState(0);
  const t = useTranslations('Index');

  // Section refs
  const heroRef = useRef<HTMLDivElement>(null);
  const envRef = useRef<HTMLDivElement>(null);
  const speedRef = useRef<HTMLDivElement>(null);
  const comparisonRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const beforeAfterRef = useRef<HTMLDivElement>(null);
  const featuredRef = useRef<HTMLDivElement>(null);
  const textureRef = useRef<HTMLDivElement>(null);
  const luxuryRef = useRef<HTMLDivElement>(null);
  const benefitsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true)
  }, [])

  // Intersection Observer for section detection
  useEffect(() => {
    if (!preloadDone) return;
    const hero = heroRef.current;
    const gallery = galleryRef.current;
    const speed = speedRef.current;
    if (!hero || !gallery || !speed) return;

    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      let stage = 0;
      entries.forEach(entry => {
        if (entry.target === gallery && entry.isIntersecting) {
          stage = 1;
        }
        if (entry.target === speed && entry.isIntersecting) {
          stage = 2;
        }
      });
      setSceneStage(stage);
    };

    const observer = new window.IntersectionObserver(handleIntersect, {
      threshold: 0.5
    });
    observer.observe(gallery);
    observer.observe(speed);
    return () => observer.disconnect();
  }, [preloadDone]);

  if (!mounted) return null

  return (
    <div className="relative">
      {/* {!preloadDone && <Preloader onComplete={() => setPreloadDone(true)} />} */}
      <NavigationSection />
      <ScrollScene sceneStage={sceneStage} />
      <main className="relative z-20" style={{ visibility: preloadDone ? 'visible' : 'hidden' }}>
        <div ref={heroRef} style={{ background: 'transparent' }}><HeroSection /></div>
        <div ref={envRef}><EnvironmentalSection /></div>
        <div ref={comparisonRef}><ComparisonSection /></div>
        <div ref={speedRef}><SpeedSection /></div>
        <div ref={galleryRef}><GallerySection /></div>
        <div ref={beforeAfterRef}><BeforeAndAfterSection /></div>
        <div ref={featuredRef}><FeaturedShowcase /></div>
        <div ref={textureRef}><TextureSamples /></div>
        <div ref={luxuryRef}><LuxurySection /></div>
        <div ref={benefitsRef}><BenefitsSection /></div>
        <div ref={ctaRef}><CTASection /></div>
      </main>
    </div>
  )
} 