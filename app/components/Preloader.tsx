"use client"
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Preloader({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [blowUp, setBlowUp] = useState(false);

  useEffect(() => {
    if (progress < 100) {
      const timer = setTimeout(() => setProgress(progress + 2), 16);
      return () => clearTimeout(timer);
    } else {
      setTimeout(() => setBlowUp(true), 300);
      setTimeout(() => onComplete(), 1200);
    }
  }, [progress, onComplete]);

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
          background: "#fff",
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
              stroke="#eee"
              strokeWidth={10}
            />
            {/* Progress circle */}
            <motion.circle
              cx={80}
              cy={80}
              r={radius}
              fill="none"
              stroke="#222"
              strokeWidth={10}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              initial={false}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 0.1, ease: "linear" }}
            />
            {/* Trowel icon (simple polygon) */}
            <motion.g
              initial={false}
              animate={{ x: trowelX - 80, y: trowelY - 80, rotate: (progress / 100) * 360 }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
            >
              <polygon
                points="0,-12 8,0 0,12 -8,0"
                fill="#888"
                stroke="#444"
                strokeWidth={2}
                transform="scale(1.2)"
              />
              {/* Handle */}
              <rect x={-2} y={12} width={4} height={16} fill="#bfa76a" rx={2} />
            </motion.g>
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