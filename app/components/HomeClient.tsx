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
import DebugInfo from "./DebugInfo";

const ScrollScene = dynamic(() => import("./ScrollScene"), { ssr: false });

export default function HomeClient() {
  const [mounted, setMounted] = useState(false)
  const [preloadDone, setPreloadDone] = useState(false)
  const [sceneStage, setSceneStage] = useState(0);
  const [currentSection, setCurrentSection] = useState<string>('hero');
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [debugData, setDebugData] = useState<any>(null);
  const t = useTranslations('Index');

  // Section refs
  const hero = useRef<HTMLDivElement>(null);
  const env = useRef<HTMLDivElement>(null);
  const benefits = useRef<HTMLDivElement>(null);
  const speed = useRef<HTMLDivElement>(null);
  const luxury = useRef<HTMLDivElement>(null);
  const comparison = useRef<HTMLDivElement>(null);
  const gallery = useRef<HTMLDivElement>(null);
  const beforeAfter = useRef<HTMLDivElement>(null);
  const featured = useRef<HTMLDivElement>(null);
  const texture = useRef<HTMLDivElement>(null);
  const cta = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true)
  }, [])

  // Intersection Observer for section detection
  useEffect(() => {
    if (!preloadDone) return;
    const heroElement = hero.current;
    const envElement = env.current;
    const comparisonElement = comparison.current;
    const speedElement = speed.current;
    const galleryElement = gallery.current;
    const beforeAfterElement = beforeAfter.current;
    const featuredElement = featured.current;
    const textureElement = texture.current;
    const luxuryElement = luxury.current;
    const benefitsElement = benefits.current;
    const ctaElement = cta.current;
    
    if (!heroElement || !envElement || !comparisonElement || !speedElement || !galleryElement || !beforeAfterElement || !featuredElement || !textureElement || !luxuryElement || !benefitsElement || !ctaElement) return;

    // Debug: Check if speed ref is properly set
    console.log('🔍 Speed ref check:', {
      speedElement: speedElement,
      speedElementCurrent: speed.current,
      speedElementTag: speedElement?.tagName,
      speedElementClasses: speedElement?.className
    });

    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      let stage = 0;
      console.log('🔍 Intersection entries:', entries.length);
      
      entries.forEach(entry => {
        // Skip hero section entirely
        if (entry.target === heroElement) {
          console.log('🔍 Skipping hero section');
          return;
        }
        
        console.log('🔍 Entry:', {
          target: entry.target,
          isIntersecting: entry.isIntersecting,
          intersectionRatio: entry.intersectionRatio,
          isSpeed: entry.target === speedElement,
          isGallery: entry.target === galleryElement
        });
        
        if (entry.isIntersecting) {
          
          if (entry.target === envElement) {
            console.log('🎯 Section entered: ENVIRONMENTAL');
            setCurrentSection('environmental');
          } else if (entry.target === comparisonElement) {
            console.log('🎯 Section entered: COMPARISON');
            setCurrentSection('comparison');
          } else if (entry.target === speedElement) {
            console.log('🎯 Section entered: SPEED');
            setCurrentSection('speed');
            stage = 1; // Only set stage to 1 for speed section
          } else if (entry.target === galleryElement) {
            console.log('🎯 Section entered: GALLERY');
            setCurrentSection('gallery');
          } else if (entry.target === beforeAfterElement) {
            console.log('🎯 Section entered: BEFORE & AFTER');
            setCurrentSection('before-after');
          } else if (entry.target === featuredElement) {
            console.log('🎯 Section entered: FEATURED');
            setCurrentSection('featured');
          } else if (entry.target === textureElement) {
            console.log('🎯 Section entered: TEXTURE');
            setCurrentSection('texture');
          } else if (entry.target === luxuryElement) {
            console.log('🎯 Section entered: LUXURY');
            setCurrentSection('luxury');
          } else if (entry.target === benefitsElement) {
            console.log('🎯 Section entered: BENEFITS');
            setCurrentSection('benefits');
          } else if (entry.target === ctaElement) {
            console.log('🎯 Section entered: CTA');
            setCurrentSection('cta');
          }
        }
      });
      
      setSceneStage(stage);
    };

    const observer = new IntersectionObserver(handleIntersect, {
      threshold: 0.3,
      rootMargin: '0px 0px -10% 0px'
    });

    // observer.observe(hero); // Removed hero from observation
    observer.observe(envElement);
    observer.observe(comparisonElement);
    observer.observe(speedElement);
    observer.observe(galleryElement);
    observer.observe(beforeAfterElement);
    observer.observe(featuredElement);
    observer.observe(textureElement);
    observer.observe(luxuryElement);
    observer.observe(benefitsElement);
    observer.observe(ctaElement);
    
    return () => observer.disconnect();
  }, [preloadDone]);

  if (!mounted) return null

  return (
    <div className="relative">
      {/* {!preloadDone && <Preloader onComplete={() => setPreloadDone(true)} />} */}
      <NavigationSection />
      <ScrollScene 
        sceneStage={sceneStage} 
        currentSection={currentSection}
        onIntroComplete={() => setScrollEnabled(true)}
        onIntroStart={() => setScrollEnabled(false)}
        onDebugUpdate={setDebugData}
      />
      {debugData && <DebugInfo {...debugData} />}
      <main 
        className="relative z-20" 
        style={{ 
          visibility: preloadDone ? 'visible' : 'hidden',
          pointerEvents: scrollEnabled ? 'auto' : 'none',
          overflow: scrollEnabled ? 'auto' : 'hidden'
        }}
      >
        <div ref={hero} className="min-h-screen">
          <HeroSection />
        </div>
        <div ref={env} className="min-h-screen">
          <EnvironmentalSection />
        </div>
        <div ref={comparison} className="min-h-screen opacity-90">
          <ComparisonSection />
        </div>
        <div ref={speed} className="min-h-screen">
          <SpeedSection />
        </div>
        <div ref={gallery} className="min-h-screen opacity-90">
          <GallerySection />
        </div>
        <div ref={beforeAfter} className="min-h-screen opacity-90">
          <BeforeAndAfterSection />
        </div>
        <div ref={featured} className="min-h-screen opacity-90">
          <FeaturedShowcase />
        </div>
        <div ref={texture} className="min-h-screen opacity-90">
          <TextureSamples />
        </div>
        <div ref={luxury} className="min-h-screen opacity-90">
          <LuxurySection />
        </div>
        <div ref={benefits} className="min-h-screen opacity-90">
          <BenefitsSection />
        </div>
        <div ref={cta} className="min-h-screen">
          <CTASection />
        </div>
      </main>
    </div>
  )
} 