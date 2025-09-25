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
  const [topOffsetPx, setTopOffsetPx] = useState<number>(16) // default 1rem
  const [bottomReservePx, setBottomReservePx] = useState<number>(100) // reserve for bottom panel in portrait
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

  // Measure header position to place timeline under its bottom edge in both orientations
  useEffect(() => {
    if (typeof window === 'undefined') return
    const computeOffset = () => {
      try {
        const nav = document.querySelector('nav') as HTMLElement | null
        if (!nav) { setTopOffsetPx(16); return }
        const rect = nav.getBoundingClientRect()
        // Align to the header's bottom border + 1rem, otherwise stick to 1rem from top
        const offset = rect.bottom > 0 ? Math.round(rect.bottom) + 16 : 16
        setTopOffsetPx(offset)
        if (process.env.NODE_ENV === 'development') {
          console.log('[TimelineWaypoints] orientation=', isPortrait ? 'portrait' : 'landscape', 'nav.bottom=', rect.bottom, 'offset(top)=', offset)
        }
        // Compute bottom reserved space for marker panel (same logic as panel height)
        const w = window.innerWidth
        const panelH = w < 640 ? 100 : (w < 1024 ? 110 : 120)
        setBottomReservePx(panelH)
      } catch {
        setTopOffsetPx(16)
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
    const nav = document.querySelector('nav')
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
      // Portrait: start below header and reserve space for bottom panel
      return { top: `${topOffsetPx}px`, bottom: `${bottomReservePx}px`, right: '1rem', left: 'auto', transform: 'none', transition: 'top 150ms ease-out' }
    }
    // Landscape: stick to top, centered horizontally, with dynamic offset from header bottom
    return { top: `${topOffsetPx}px`, left: 0, right: 0, transform: 'none', transition: 'top 150ms ease-out' }
  }, [isPortrait, topOffsetPx, bottomReservePx])

  const containerClasses = useMemo(() => (
    isPortrait 
      ? "fixed z-[49] select-none w-auto h-auto flex items-center justify-center"
      : "fixed z-[49] select-none w-full"
  ), [isPortrait])

  const lineClasses = useMemo(() => {
    return isPortrait
      ? "relative w-[2px] flex-1 bg-light-dark/10 dark:bg-white/10 mx-auto min-h-8"
      : "relative h-[2px] flex-1 bg-light-dark/10 dark:bg-white/10 my-2 min-w-8"
  }, [isPortrait])

  const dotCommon = "w-5 h-5 rounded-full bg-light-dark dark:bg-white/90 hover:bg-light-main dark:hover:bg-gray-300 transition-colors cursor-pointer shadow ring-2 ring-white/60 dark:ring-black/30"

  const handleClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[TimelineWaypoints] Dot clicked, requesting waypoint:', index)
    dispatchGoToWaypoint(index)
  }

  // Progress mapping: kitchen(2) -> 0%, bath(6) -> 50%, living(9) -> 100%
  // Using default path of 9 points (indices 0..8)
  const kitchenT = 1 / 8; // waypoint 2
  const bathT = 5 / 8;    // waypoint 6
  const livingT = 1;      // waypoint 9
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
  const seg1Fill = clamp01((progressT - kitchenT) / Math.max(1e-6, (bathT - kitchenT)))
  const seg2Fill = progressT < bathT ? 0 : clamp01((progressT - bathT) / Math.max(1e-6, (livingT - bathT)))

  return (
    <div className={`${containerClasses} ${className ?? ''}`} style={containerStyle} aria-label="Timeline waypoints">
      {/* Vertical layout: column, fill height; Horizontal: row, fill width; always centered */}
      <div className={`flex ${isPortrait ? 'flex-col items-center justify-center h-full py-4' : 'flex-row items-center justify-center w-full'} px-4`}>
        {/* First dot: Kitchen -> waypoint 2 */}
        <button
          aria-label={t('kitchenTour')}
          className={`${dotCommon} ${isPortrait ? '' : 'mr-3'}`}
          onClick={(e) => handleClick(e, WAYPOINTS.kitchen)}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
        />
        {isPortrait
          ? <span className="mt-2 mb-2 text-xs text-foreground/80">{t('kitchenTour')}</span>
          : <span className="ml-2 mr-3 text-xs text-foreground/80">{t('kitchenTour')}</span>}

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
          aria-label={t('bathroomWalkthrough')}
          className={`${dotCommon} ${isPortrait ? '' : 'mx-3'}`}
          onClick={(e) => handleClick(e, WAYPOINTS.bath)}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
        />
        {isPortrait
          ? <span className="mt-2 mb-2 text-xs text-foreground/80">{t('bathroomWalkthrough')}</span>
          : <span className="ml-2 mr-3 text-xs text-foreground/80">{t('bathroomWalkthrough')}</span>}

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
          aria-label={t('livingRoomTour')}
          className={`${dotCommon} ${isPortrait ? '' : 'ml-3'}`}
          onClick={(e) => handleClick(e, WAYPOINTS.living)}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
        />
        {isPortrait
          ? <span className="mt-2 text-xs text-foreground/80">{t('livingRoomTour')}</span>
          : <span className="ml-2 text-xs text-foreground/80">{t('livingRoomTour')}</span>}

        {/* No trailing line after last dot; progress ends at Living */}
      </div>
    </div>
  )
}


