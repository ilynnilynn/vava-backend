'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'

const PRICE_RANGES = [
  { label: 'NT$500 以下', min: 0, max: 500 },
  { label: 'NT$500–1000', min: 500, max: 1000 },
  { label: 'NT$1000–2000', min: 1000, max: 2000 },
  { label: 'NT$2000+', min: 2000, max: undefined },
] as const

export default function SearchFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentMin = searchParams.get('minPrice')
  const currentMax = searchParams.get('maxPrice')
  const currentQ = searchParams.get('q') ?? ''

  const [locationQuery, setLocationQuery] = useState(currentQ)

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === '') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      }
      router.push(`?${params.toString()}`)
    },
    [router, searchParams]
  )

  function handlePriceToggle(min: number, max: number | undefined) {
    const isActive =
      currentMin === String(min) &&
      (max === undefined ? !currentMax : currentMax === String(max))

    if (isActive) {
      updateParams({ minPrice: undefined, maxPrice: undefined })
    } else {
      updateParams({
        minPrice: String(min),
        maxPrice: max !== undefined ? String(max) : undefined,
      })
    }
  }

  function handleLocationSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateParams({ q: locationQuery.trim() || undefined })
  }

  return (
    <div className="space-y-3">
      {/* Price range chips */}
      <div className="flex flex-wrap gap-2">
        {PRICE_RANGES.map(({ label, min, max }) => {
          const isActive =
            currentMin === String(min) &&
            (max === undefined ? !currentMax : currentMax === String(max))

          return (
            <button
              key={label}
              onClick={() => handlePriceToggle(min, max)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? 'border-foreground bg-foreground text-primary-foreground'
                  : 'border-border bg-card text-foreground hover:border-foreground/30'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Location search */}
      <form onSubmit={handleLocationSubmit} className="flex gap-2">
        <Input
          value={locationQuery}
          onChange={(e) => setLocationQuery(e.target.value)}
          placeholder="搜尋地區（例：大安、信義）"
          className="text-sm"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
        >
          搜尋
        </button>
      </form>
    </div>
  )
}
