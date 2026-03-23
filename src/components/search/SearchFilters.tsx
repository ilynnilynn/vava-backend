'use client'

import { useRouter } from 'next/navigation'

const PRICE_RANGES = [
  { label: 'NT$500 以下', min: 0, max: 500 },
  { label: 'NT$500–1000', min: 500, max: 1000 },
  { label: 'NT$1000–2000', min: 1000, max: 2000 },
  { label: 'NT$2000+', min: 2000, max: null },
] as const

const DISTANCE_PRESETS = [
  { label: '1km', value: 1 },
  { label: '3km', value: 3 },
  { label: '5km', value: 5 },
] as const

type Props = {
  minPrice: number | null
  maxPrice: number | null
  maxDistanceKm: number | null
  hasUserLocation: boolean
  wizardParams: string
  onPriceChange: (min: number | null, max: number | null) => void
  onDistanceChange: (km: number | null) => void
}

export default function SearchFilters({
  minPrice,
  maxPrice,
  maxDistanceKm,
  hasUserLocation,
  wizardParams,
  onPriceChange,
  onDistanceChange,
}: Props) {
  const router = useRouter()

  function handlePriceToggle(min: number, max: number | null) {
    const isActive = minPrice === min && maxPrice === max
    if (isActive) {
      onPriceChange(null, null)
    } else {
      onPriceChange(min, max)
    }
  }

  function handleDistanceToggle(km: number) {
    onDistanceChange(maxDistanceKm === km ? null : km)
  }

  return (
    <div className="space-y-3">
      {/* Price range chips */}
      <div className="flex flex-wrap gap-2">
        {PRICE_RANGES.map(({ label, min, max }) => {
          const isActive = minPrice === min && maxPrice === max
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

      {/* Distance presets — only shown if user has location */}
      {hasUserLocation && (
        <div className="flex gap-2">
          {DISTANCE_PRESETS.map(({ label, value }) => {
            const isActive = maxDistanceKm === value
            return (
              <button
                key={value}
                onClick={() => handleDistanceToggle(value)}
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
      )}

      {/* Edit request button */}
      <button
        onClick={() => router.push(`/book?${wizardParams}`)}
        className="text-xs font-medium text-foreground underline"
      >
        編輯需求
      </button>
    </div>
  )
}
