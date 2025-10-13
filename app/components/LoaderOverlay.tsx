'use client'

import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useThemeStore } from '@/lib/stores/themeStore'

interface LoaderOverlayProps {
  percent: number
  loadedMB: number
  totalMB: number | null
}

export default function LoaderOverlay({ percent, loadedMB, totalMB }: LoaderOverlayProps) {
  const { resolvedTheme } = useThemeStore()
  
  // Get portal root element
  const modalRoot = typeof document !== 'undefined' ? document.getElementById('loader-modal-root') : null

  // Don't render if portal root is not available (SSR or not mounted)
  if (!modalRoot) return null
  
  // Don't render if percent is 0 and no bytes loaded (not actually loading yet)
  // This prevents the "stuck at 0%" bug
  if (percent === 0 && loadedMB === 0 && totalMB === null) {
    console.log('⏸️ [LoaderOverlay] Skipping render - no progress yet')
    return null
  }

  const isDark = resolvedTheme === 'dark'
  
  console.log('📊 [LoaderOverlay] Rendering:', { percent: Math.round(percent), loadedMB: loadedMB.toFixed(1), totalMB: totalMB?.toFixed(1) || 'unknown' })

  // Use createPortal to render outside the normal React tree
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100000] flex items-center justify-center"
      style={{
        background: isDark 
          ? 'rgba(0, 0, 0, 0.85)' 
          : 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="text-center px-4 max-w-md w-full">
        {/* Progress bar container */}
        <div 
          className="w-full h-3 rounded-full overflow-hidden mb-8"
          style={{
            background: isDark 
              ? 'rgba(255, 255, 255, 0.1)' 
              : 'rgba(0, 0, 0, 0.1)',
            boxShadow: isDark
              ? '0 4px 12px rgba(0, 0, 0, 0.5)'
              : '0 4px 12px rgba(0, 0, 0, 0.1)',
          }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #22c55e, #06b6d4, #3b82f6)',
              backgroundSize: '200% 100%',
            }}
            initial={{ width: '0%' }}
            animate={{ width: `${Math.min(100, percent)}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>

        {/* Large percentage */}
        <motion.div
          className="text-[72px] font-bold leading-none mb-4"
          style={{
            fontFamily: 'monospace',
            color: isDark ? '#fff' : '#000',
            textShadow: isDark
              ? '0 4px 16px rgba(0, 0, 0, 0.8)'
              : '0 4px 16px rgba(0, 0, 0, 0.1)',
            letterSpacing: '0.05em',
          }}
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {Math.round(percent)}%
        </motion.div>

        {/* Loading text with MB info */}
        <motion.div
          className="text-lg font-medium"
          style={{
            color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
            fontFamily: 'monospace',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {totalMB 
            ? `Loading: ${loadedMB.toFixed(1)} MB / ${totalMB.toFixed(1)} MB`
            : `Loading: ${loadedMB.toFixed(1)} MB`
          }
        </motion.div>

        {/* Loading animation dots */}
        <motion.div
          className="flex justify-center gap-2 mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{
                background: isDark ? '#fff' : '#000',
              }}
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [1, 1.3, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>,
    modalRoot
  )
}

