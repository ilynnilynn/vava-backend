'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'

interface Prediction {
  place_id: string
  description: string
}

interface AddressAutocompleteProps {
  value: string
  onChange: (address: string) => void
  placeholder?: string
  className?: string
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder,
  className,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value)
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blurRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Sync external value changes (e.g. reset)
  useEffect(() => { setQuery(value) }, [value])

  const fetchPredictions = useCallback((input: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)

    if (input.trim().length < 2) {
      setPredictions([])
      setOpen(false)
      return
    }

    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(input)}`)
        const data = await res.json()
        const items: Prediction[] = data.predictions ?? []
        setPredictions(items)
        setOpen(items.length > 0)
        setActiveIdx(-1)
      } catch {
        setPredictions([])
        setOpen(false)
      }
    }, 300)
  }, [])

  function handleInputChange(val: string) {
    setQuery(val)
    onChange(val)
    fetchPredictions(val)
  }

  function selectPrediction(desc: string) {
    setQuery(desc)
    onChange(desc)
    setPredictions([])
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || predictions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => (i < predictions.length - 1 ? i + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => (i > 0 ? i - 1 : predictions.length - 1))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      selectPrediction(predictions[activeIdx].description)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  function handleBlur() {
    // Small delay so click on dropdown item fires first
    blurRef.current = setTimeout(() => setOpen(false), 150)
  }

  function handleFocus() {
    if (blurRef.current) clearTimeout(blurRef.current)
    if (predictions.length > 0) setOpen(true)
  }

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (blurRef.current) clearTimeout(blurRef.current)
    }
  }, [])

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={query}
        onChange={e => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />

      {open && predictions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          {predictions.map((p, idx) => (
            <li key={p.place_id}>
              <button
                type="button"
                onMouseDown={() => selectPrediction(p.description)}
                className={[
                  'w-full px-4 py-3 text-left text-sm transition-colors',
                  idx === activeIdx
                    ? 'bg-accent text-accent-foreground'
                    : 'text-foreground hover:bg-accent/50',
                ].join(' ')}
              >
                {p.description}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
