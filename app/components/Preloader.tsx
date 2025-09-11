"use client"
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Preloader({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [blowUp, setBlowUp] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') ||
        window.matchMedia?.('(prefers-color-scheme: dark)').matches ||
        false;
    }
    return false;
  });

  useEffect(() => {
    if (progress < 100) {
      const timer = setTimeout(() => setProgress(progress + 2), 16);
      return () => clearTimeout(timer);
    } else {
      setTimeout(() => setBlowUp(true), 300);
      setTimeout(() => onComplete(), 1200);
    }
  }, [progress, onComplete]);

  // Watch for theme changes
  useEffect(() => {
    const updateTheme = () => {
      const darkClass = document.documentElement.classList.contains('dark');
      const mql = window.matchMedia?.('(prefers-color-scheme: dark)');
      setIsDark(darkClass || (!!mql && mql.matches));
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const mql = window.matchMedia?.('(prefers-color-scheme: dark)');
    const mqlHandler = () => updateTheme();
    mql?.addEventListener?.('change', mqlHandler as any);

    return () => {
      observer.disconnect();
      mql?.removeEventListener?.('change', mqlHandler as any);
    };
  }, []);

  // Circle parameters
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  // Trowel position (center of circle)
  const trowelX = 80;
  const trowelY = 80;

  return (
    <AnimatePresence>
      <motion.div
        key="preloader"
        initial={{ opacity: 1 }}
        animate={{ opacity: blowUp ? 1 : 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: 'hsl(var(--background))',
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <motion.div
          initial={{ scale: 1 }}
          animate={{ scale: blowUp ? 30 : 1 }}
          transition={{ duration: 0.9, ease: "easeInOut" }}
          style={{ borderRadius: "50%", overflow: "hidden" }}
        >
          <svg width={160} height={160}>
            {/* Empty circle */}
            <circle
              cx={80}
              cy={80}
              r={radius}
              fill="none"
              stroke={isDark ? 'hsla(0,0%,100%,0.15)' : 'hsl(var(--muted-foreground) / 0.2)'}
              strokeWidth={10}
            />
            {/* Progress circle */}
            <motion.circle
              cx={80}
              cy={80}
              r={radius}
              fill="none"
              stroke={isDark ? '#8b5cf6' : 'hsl(var(--foreground))'}
              strokeWidth={10}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 80 80)"
              initial={false}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 0.1, ease: "linear" }}
            />
          </svg>
        </motion.div>
        <motion.div
          className="absolute"
          style={{
            left: trowelX - 12,
            top: trowelY - 12,
          }}
          animate={{
            scale: progress >= 100 ? 20 : 1,
            opacity: progress >= 100 ? 0 : 1,
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L14.5 8.5L21 11L14.5 13.5L12 20L9.5 13.5L3 11L9.5 8.5L12 2Z"
              fill="currentColor"
            />
          </svg>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 