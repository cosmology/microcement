"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { WAYPOINTS, dispatchGoToWaypoint } from "@/lib/scene/waypoints"
import { useTranslations } from 'next-intl'

type TimelineWaypointsProps = {
  className?: string
}

export default function TimelineWaypoints({ className }: TimelineWaypointsProps) {
  const t = useTranslations('Navigation')
  const [isPortrait, setIsPortrait] = useState(false)
  const [topOffsetPx, setTopOffsetPx] = useState<number>(10) // 10px from top nav
  const rafRef = useRef<number | null>(null)
  const [progressT, setProgressT] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(orientation: portrait)')
    const update = () => setIsPortrait(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Listen to camera path progress to drive the inline loader
  useEffect(() => {
    const handler = (e: any) => {
      const t = Math.max(0, Math.min(1, e?.detail?.t ?? 0))
      setProgressT(t)
    }
    window.addEventListener('camera-path-progress', handler)
    return () => window.removeEventListener('camera-path-progress', handler)
  }, [])

  // Calculate positioning based on nav height and orientation
  useEffect(() => {
    if (typeof window === 'undefined') return
    const computeOffset = () => {
      try {
        const nav = document.getElementById('main-navigation') as HTMLElement | null
        if (!nav) { 
          setTopOffsetPx(10); 
          return 
        }
        
        const rect = nav.getBoundingClientRect()


        // Always 10px padding from the top nav
        const offset = rect.bottom > 0 ? Math.round(rect.bottom) + 10 : 10
        setTopOffsetPx(offset)
        
        
      } catch {
        setTopOffsetPx(10)
      }
    }
    computeOffset()

    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(computeOffset)
    }
    const onResize = () => computeOffset()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    const obs = new MutationObserver(() => computeOffset())
    const nav = document.getElementById('main-navigation')
    if (nav) obs.observe(nav, { attributes: true, attributeFilter: ['style', 'class'] })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      obs.disconnect()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const containerStyle = useMemo<React.CSSProperties>(() => {
    if (isPortrait) {
      // Portrait: vertical timeline positioned on right side with fixed width
      const navHeight = typeof window !== 'undefined' ? 
        (document.getElementById('main-navigation')?.getBoundingClientRect().bottom || 0) : 0
      const navHeightPx = Math.round(navHeight) + 14 // nav height + 10px padding
      
      // Get docked navigation width (expanded = 192px, collapsed = 48px)
      const dockNavElement = document.querySelector('[class*="fixed left-0"]') as HTMLElement | null
      const dockNavWidth = dockNavElement ? 
        (dockNavElement.classList.contains('w-48') ? 192 : 48) : 0 // w-48 = 192px, w-12 = 48px
      
      // Portrait: fixed width timeline positioned on right side
      const timelineWidth = 70 // Fixed width for vertical timeline
      
      // Console log navHeightPx for portrait
      
      return { 
        top: `${navHeightPx}px`, 
        bottom: '0px', 
        left: 'auto', 
        right: '1rem', // Position from right edge with 1rem padding
        width: `${timelineWidth}px`,
        transform: 'none', 
        transition: 'top 150ms ease-out' 
      }
    }
    // Landscape: account for docked navigation width and reserve space on the right for full last label
    const dockNavElement = typeof window !== 'undefined' ? 
      document.querySelector('[class*="fixed left-0"]') as HTMLElement | null : null
    const dockNavWidth = dockNavElement ? 
      (dockNavElement.classList.contains('w-48') ? 192 : 48) : 0 // w-48 = 192px, w-12 = 48px
    // Reserve right-side space so the "Living Room" label never clips off-screen
    // Revert reserved right-side space adjustment
    
    return { 
      top: `${topOffsetPx}px`, 
      left: `${dockNavWidth}px`, 
      right: '0px', 
      bottom: 'auto', 
      transform: 'none', 
      transition: 'top 150ms ease-out' 
    }
  }, [isPortrait, topOffsetPx])

  const containerClasses = useMemo(() => (
    isPortrait 
      ? "fixed z-[49] select-none w-auto h-auto flex items-center justify-center"
      : "fixed z-[49] select-none w-full pt-1"
  ), [isPortrait])

  const lineClasses = useMemo(() => {
    return isPortrait
      ? "relative w-[2px] flex-1 bg-light-dark/10 dark:bg-white/10 mx-auto min-h-8"
      : "relative h-[2px] flex-1 bg-light-dark/10 dark:bg-white/10 my-2 min-w-8"
  }, [isPortrait])

  const dotBase = "w-5 h-5 rounded-full transition-colors cursor-pointer shadow ring-2 ring-white/60 dark:ring-black/30"
  const inactiveDot = "bg-gray-300 dark:bg-gray-600"
  const activeDot = "bg-purple-600 dark:bg-purple-400"
  const hoverDot = "hover:bg-purple-600 dark:hover:bg-purple-400"

  const handleClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    dispatchGoToWaypoint(index)
  }

  // Progress mapping: kitchen(2) -> 0%, bath(6) -> 50%, living(9) -> 100%
  // Using default path of 9 points (indices 0..8)
  const kitchenT = 1 / 8; // waypoint 2
  const bathT = 5 / 8;    // waypoint 6
  const livingT = 1;      // waypoint 9
  const EPS = 0.02;       // tolerance so last dot turns active near the end
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
  const seg1Fill = clamp01((progressT - kitchenT) / Math.max(1e-6, (bathT - kitchenT)))
  const seg2Fill = progressT < bathT ? 0 : clamp01((progressT - bathT) / Math.max(1e-6, (livingT - bathT)))

  // Determine active states based on progress
  const isKitchenPassed = progressT >= kitchenT + 1e-6
  const isBathPassed = progressT >= bathT + 1e-6
  const isLivingPassed = progressT >= (livingT - EPS)

  return (
    <div className={`${containerClasses} ${className ?? ''}`} style={containerStyle} aria-label="Timeline waypoints">
      {/* Portrait: column fills height aligned right, Landscape: row fills width; always centered */}
      <div 
        className={`flex ${isPortrait ? 'flex-col items-center justify-center h-full py-4 px-4 text-center' : 'flex-row items-center justify-center w-full px-4'}`}
        style={isPortrait ? undefined : { paddingRight: '4rem' }}
      >
        {/* First dot: Kitchen -> waypoint 2 */}
        <button
          aria-label={t('kitchen')}
          className={`${dotBase} ${isKitchenPassed ? activeDot : inactiveDot} ${hoverDot} ${isPortrait ? '' : 'mr-1'}`}
          onClick={(e) => handleClick(e, WAYPOINTS.kitchen)}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
        />
        {isPortrait
          ? <span className="mt-2 mb-2 text-xs text-foreground/80 text-center">{t('kitchen')}</span>
          : <span className="ml-2 mr-3 text-xs text-foreground/80">{t('kitchen')}</span>}

        {/* Line between dots */}
        <div className={lineClasses}>
          {/* Single progress segment from Kitchen (0%) to Bath (50%) */}
          {isPortrait ? (
            <div 
              className="absolute left-0 right-0 bg-purple-500/70 dark:bg-purple-400/80"
              style={{ top: 0, height: `${seg1Fill * 100}%` }}
            />
          ) : (
            <div 
              className="absolute top-0 bottom-0 bg-purple-500/70 dark:bg-purple-400/80"
              style={{ left: 0, width: `${seg1Fill * 100}%` }}
            />
          )}
        </div>

        {/* Second dot: Bath -> waypoint 6 */}
        <button
          aria-label={t('bathroom')}
          className={`${dotBase} ${isBathPassed ? activeDot : inactiveDot} ${hoverDot} ${isPortrait ? '' : 'ml-3'}`}
          onClick={(e) => handleClick(e, WAYPOINTS.bath)}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
        />
        {isPortrait
          ? <span className="mt-2 text-xs text-foreground/80 text-center">{t('bathroom')}</span>
          : <span className="ml-2 mr-3 text-xs text-foreground/80">{t('bathroom')}</span>}

        {/* Line between dots */}
        <div className={lineClasses}>
          {/* Single progress segment from Bath (50%) to Living (100%) */}
          {isPortrait ? (
            <div 
              className="absolute left-0 right-0 bg-purple-500/70 dark:bg-purple-400/80"
              style={{ top: 0, height: `${seg2Fill * 100}%` }}
            />
          ) : (
            <div 
              className="absolute top-0 bottom-0 bg-purple-500/70 dark:bg-purple-400/80"
              style={{ left: 0, width: `${seg2Fill * 100}%` }}
            />
          )}
        </div>

        {/* Third dot: Living area -> waypoint 9 */}
        <button
          aria-label={t('livingRoom')}
          className={`${dotBase} ${isLivingPassed ? activeDot : inactiveDot} ${hoverDot} ${isPortrait ? '' : 'ml-3'}`}
          onClick={(e) => handleClick(e, WAYPOINTS.living)}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
        />
        {isPortrait
          ? <span className="mt-2 text-xs text-foreground/80 text-center whitespace-nowrap">{t('livingRoom')}</span>
          : <span className="ml-2 text-xs text-foreground/80 whitespace-nowrap">{t('livingRoom')}</span>}

        {/* No trailing line after last dot; progress ends at Living */}
      </div>
    </div>
  )
}


