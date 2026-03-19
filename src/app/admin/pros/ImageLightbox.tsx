'use client'

import { useState } from 'react'

export function ImageLightbox({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`${className ?? ''} cursor-pointer hover:opacity-80 transition-opacity`}
        onClick={() => setOpen(true)}
      />

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setOpen(false)}
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full w-10 h-10 flex items-center justify-center text-xl hover:bg-black/70 transition-colors"
          >
            &times;
          </button>
          <img
            src={src}
            alt={alt}
            className="max-w-[80vw] max-h-[80vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
