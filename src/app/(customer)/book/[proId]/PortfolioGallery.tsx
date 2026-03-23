'use client'

import { useState, useCallback, useEffect } from 'react'

type Props = {
  photos: string[]
  initialIndex: number
  onClose: () => void
}

export default function PortfolioGallery({ photos, initialIndex, onClose }: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  const goNext = useCallback(() => {
    setCurrentIndex(i => (i + 1) % photos.length)
  }, [photos.length])

  const goPrev = useCallback(() => {
    setCurrentIndex(i => (i - 1 + photos.length) % photos.length)
  }, [photos.length])

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, goNext, goPrev])

  // Touch swipe
  const [touchStart, setTouchStart] = useState<number | null>(null)

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStart(e.touches[0].clientX)
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStart === null) return
    const diff = e.changedTouches[0].clientX - touchStart
    if (Math.abs(diff) > 50) {
      if (diff > 0) goPrev()
      else goNext()
    }
    setTouchStart(null)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white text-lg backdrop-blur-sm"
        aria-label="關閉"
      >
        ✕
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-sm text-white/70">
        {currentIndex + 1} / {photos.length}
      </div>

      {/* Previous arrow */}
      {photos.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev() }}
          className="absolute left-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white text-lg backdrop-blur-sm"
          aria-label="上一張"
        >
          ‹
        </button>
      )}

      {/* Image */}
      <div
        className="flex h-full w-full items-center justify-center px-12"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photos[currentIndex]}
          alt={`作品 ${currentIndex + 1}`}
          className="max-h-[80vh] max-w-full rounded-lg object-contain"
        />
      </div>

      {/* Next arrow */}
      {photos.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext() }}
          className="absolute right-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white text-lg backdrop-blur-sm"
          aria-label="下一張"
        >
          ›
        </button>
      )}
    </div>
  )
}
