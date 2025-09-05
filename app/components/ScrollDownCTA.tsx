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

  // Handle intro completion - only trigger when explicitly called
  const handleIntroComplete = () => {
    console.log('🎯 ScrollDownCTA: Intro completed, triggering fadeIn');
    console.log('🎯 ScrollDownCTA: Current states - isVisible:', isVisible, 'isIntroFinished:', isIntroFinished, 'isFadeIn:', isFadeIn);
    setIsIntroFinished(true);
    setIsVisible(true);
    
    // Add fadeIn effect after a small delay
    setTimeout(() => {
      console.log('🎯 ScrollDownCTA: Applying fadeIn class');
      setIsFadeIn(true);
    }, 100);
  };

  // Expose the handler to parent immediately on mount
  useEffect(() => {
    console.log('🎯 ScrollDownCTA: Component mounted, exposing handler');
    (window as any).__scrollDownCTAIntroComplete = handleIntroComplete;
    
    return () => {
      console.log('🎯 ScrollDownCTA: Component unmounting, cleaning up handler');
      delete (window as any).__scrollDownCTAIntroComplete;
    };
  }, []); // Empty dependency array to run only on mount

  // Handle scroll to hide/show ScrollDownCTA based on scroll position
  useEffect(() => {
    const checkScrollPosition = () => {
      const scrollY = window.scrollY;
      if (scrollY > 0 && isVisible && !isFadeOut) {
        console.log('🎯 ScrollDownCTA: Starting fadeOut due to scroll position:', scrollY);
        setIsFadeOut(true);
        setIsFadeIn(false);
        
        // Hide after fadeOut animation completes
        setTimeout(() => {
          setIsVisible(false);
          setIsFadeOut(false);
        }, 400); // Match the CSS transition duration
      } else if (scrollY === 0 && !isVisible && isIntroFinished && !isFadeIn) {
        console.log('🎯 ScrollDownCTA: Showing due to scroll position at top:', scrollY);
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
  }, [isVisible, isIntroFinished, isFadeIn, isFadeOut]); // Include all animation states

  if (!isVisible) return null;

  console.log('🎯 ScrollDownCTA: Rendering component with fadeIn:', isFadeIn, 'fadeOut:', isFadeOut);

  return (
    <div className={`fixed z-[9999] left-1/2 top-4 transform -translate-x-1/2 scroll-down-cta ${isFadeIn ? 'fade-in' : ''} ${isFadeOut ? 'fade-out' : ''} ${className}`}>
      <div className="arrow arrow-first"></div>
      <div className="arrow arrow-second"></div>
    </div>
  );
}
