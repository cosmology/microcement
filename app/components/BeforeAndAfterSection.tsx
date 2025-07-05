"use client"

import { useRef, useState } from "react"

export default function BeforeAndAfterSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [sliderX, setSliderX] = useState(50) // percent

  // Drag logic
  function handleDrag(e: React.MouseEvent | React.TouchEvent) {
    const clientX =
      "touches" in e
        ? e.touches[0].clientX
        : (e as React.MouseEvent).clientX
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    let percent = ((clientX - rect.left) / rect.width) * 100
    percent = Math.max(0, Math.min(100, percent))
    setSliderX(percent)
  }

  function startDrag(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    function move(ev: any) {
      handleDrag(ev)
    }
    function up() {
      window.removeEventListener("mousemove", move)
      window.removeEventListener("touchmove", move)
      window.removeEventListener("mouseup", up)
      window.removeEventListener("touchend", up)
    }
    window.addEventListener("mousemove", move)
    window.addEventListener("touchmove", move)
    window.addEventListener("mouseup", up)
    window.addEventListener("touchend", up)
  }

  return (
    <section className="py-20 bg-gray-100 dark:bg-gray-900 px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-10 text-gray-900 dark:text-white" style={{ fontFamily: '"Publico Banner", "Frutiger LT Pro", "Narkiss Tam", sans-serif' }}>
          Before & After
        </h2>
        <div
          ref={containerRef}
          className="relative w-full h-72 md:h-96 rounded-lg overflow-hidden shadow-lg select-none"
          onMouseDown={startDrag}
          onTouchStart={startDrag}
          style={{ touchAction: "none", background: "#fff" }}
        >
          {/* Before (left side) */}
          <div
            className="absolute inset-0"
            style={{
              width: `${sliderX}%`,
              background: "#fff",
              transition: "background 0.2s",
              zIndex: 1,
            }}
          />
          {/* After (right side) */}
          <div
            className="absolute inset-0"
            style={{
              left: `${sliderX}%`,
              width: `${100 - sliderX}%`,
              background: "#000",
              transition: "background 0.2s",
              zIndex: 2,
            }}
          />
          {/* Slider handle */}
          <div
            className="absolute top-0 bottom-0"
            style={{
              left: `calc(${sliderX}% - 1rem)`,
              width: "2rem",
              cursor: "ew-resize",
              zIndex: 3,
              transition: "background 0.2s",
            }}
          >
            <div className="h-full flex items-center justify-center">
              <div className="w-2 h-16 bg-primary rounded-full shadow-lg mx-auto" />
            </div>
          </div>
          {/* Labels */}
          <span className="absolute left-4 top-4 text-gray-700 dark:text-gray-200 font-semibold z-10">Before</span>
          <span className="absolute right-4 top-4 text-gray-200 dark:text-gray-300 font-semibold z-10">After</span>
        </div>
      </div>
    </section>
  )
} 