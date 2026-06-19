'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

type ImageState = 'loading' | 'loaded' | 'error'

export function ImageLightbox({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const [imageState, setImageState] = useState<ImageState>('loading')
  const [prevSrc, setPrevSrc] = useState(src)

  // Reset state when src changes (derived state pattern — no useEffect needed)
  if (src !== prevSrc) {
    setPrevSrc(src)
    setImageState('loading')
  }

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  function handleRetry() {
    setImageState('loading')
  }

  // open starts false so createPortal never runs during SSR (short-circuit)
  const overlay = open
    ? createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85"
          onClick={() => setOpen(false)}
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full w-10 h-10 flex items-center justify-center text-xl hover:bg-black/70 transition-colors"
            aria-label="Close"
          >
            &times;
          </button>
          {imageState === 'error' ? (
            <div className="text-center text-white" onClick={(e) => e.stopPropagation()}>
              <p className="text-sm text-white/70 mb-3">Image failed to load</p>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-md text-sm transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <img
              src={src}
              alt={alt}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              onLoad={() => setImageState('loaded')}
              onError={() => setImageState('error')}
            />
          )}
        </div>,
        document.body
      )
    : null

  return (
    <>
      <div className={`relative ${className ?? ''}`}>
        {imageState === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-md animate-pulse">
            <span className="text-xs text-muted-foreground">Loading...</span>
          </div>
        )}

        {imageState === 'error' ? (
          <div className="flex flex-col items-center justify-center bg-muted rounded-md p-4 min-h-[80px]">
            <p className="text-xs text-muted-foreground mb-2">Image failed to load</p>
            <button
              onClick={handleRetry}
              className="text-xs px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <img
            key={imageState === 'loading' ? src : undefined}
            src={src}
            alt={alt}
            className={`cursor-pointer hover:opacity-80 transition-opacity ${imageState === 'loading' ? 'opacity-0' : 'opacity-100'}`}
            onClick={() => setOpen(true)}
            onLoad={() => setImageState('loaded')}
            onError={() => setImageState('error')}
          />
        )}
      </div>
      {overlay}
    </>
  )
}
