"use client";

import { useEffect, useState } from 'react';

interface ScrollDownCTAProps {
  className?: string;
  onIntroComplete?: () => void;
}

export default function ScrollDownCTA({ className = "", onIntroComplete }: ScrollDownCTAProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isIntroFinished, setIsIntroFinished] = useState(false);
  const [isFadeIn, setIsFadeIn] = useState(false);
  const [isFadeOut, setIsFadeOut] = useState(false);
  const [suppressHideUntil, setSuppressHideUntil] = useState<number | null>(null);

  // Handle intro completion - only trigger when explicitly called
  const handleIntroComplete = () => {
    setIsIntroFinished(true);
    setIsVisible(true);
    // Prevent immediate auto-hide if page is already scrolled
    setSuppressHideUntil(Date.now() + 1500);
    
    // Add fadeIn effect after a small delay
    setTimeout(() => {
      setIsFadeIn(true);
    }, 100);
  };

  // Expose the handler to parent immediately on mount
  useEffect(() => {
    (window as any).__scrollDownCTAIntroComplete = handleIntroComplete;
    
    return () => {
      delete (window as any).__scrollDownCTAIntroComplete;
    };
  }, []); // Empty dependency array to run only on mount

  // Handle scroll to hide/show ScrollDownCTA based on scroll position
  useEffect(() => {
    const checkScrollPosition = () => {
      const scrollY = window.scrollY;
      // Respect suppression window (e.g., after returning to main path)
      if (suppressHideUntil && Date.now() < suppressHideUntil) {
        return;
      }
      // Hide when page is scrolled
      if (scrollY > 0 && isVisible && !isFadeOut) {
        setIsFadeOut(true);
        setIsFadeIn(false);
        
        // Hide after fadeOut animation completes
        setTimeout(() => {
          setIsVisible(false);
          setIsFadeOut(false);
        }, 400); // Match the CSS transition duration
      } else if (scrollY === 0 && !isVisible && isIntroFinished && !isFadeIn) {
        setIsVisible(true);
        setTimeout(() => setIsFadeIn(true), 100);
      }
    };

    // Check on mount
    checkScrollPosition();

    // Add scroll listener
    window.addEventListener('scroll', checkScrollPosition, { passive: true });

    return () => {
      window.removeEventListener('scroll', checkScrollPosition);
    };
  }, [isVisible, isIntroFinished, isFadeIn, isFadeOut, suppressHideUntil]); // Include all animation states

  if (!isVisible) return null;


  return (
    <div className={`fixed z-[1000] left-1/2 bottom-4 transform -translate-x-1/2 mb-10 scroll-down-cta ${isFadeIn ? 'fade-in' : ''} ${isFadeOut ? 'fade-out' : ''} ${className}`}>
      <div className="arrow arrow-first"></div>
      <div className="arrow arrow-second"></div>
    </div>
  );
}
