'use client'

import { useRouter } from 'next/navigation'

const PRICE_RANGES = [
  { label: '不限', min: null, max: null },
  { label: 'NT$500 以下', min: 0, max: 500 },
  { label: 'NT$500–1000', min: 500, max: 1000 },
  { label: 'NT$1000–2000', min: 1000, max: 2000 },
  { label: 'NT$2000+', min: 2000, max: null },
] as const

const DISTANCE_PRESETS = [
  { label: '不限', value: null },
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

  function handlePriceSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const idx = parseInt(e.target.value, 10)
    const range = PRICE_RANGES[idx]
    onPriceChange(range.min, range.max)
  }

  function handleDistanceSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const idx = parseInt(e.target.value, 10)
    onDistanceChange(DISTANCE_PRESETS[idx].value)
  }

  const activePriceIdx = PRICE_RANGES.findIndex(
    r => r.min === minPrice && r.max === maxPrice,
  )

  const activeDistIdx = DISTANCE_PRESETS.findIndex(
    d => d.value === maxDistanceKm,
  )

  return (
    <div className="flex items-center gap-2">
      {/* Price dropdown */}
      <select
        value={activePriceIdx === -1 ? 0 : activePriceIdx}
        onChange={handlePriceSelect}
        className="h-8 rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground"
      >
        {PRICE_RANGES.map((r, i) => (
          <option key={i} value={i}>
            {i === 0 ? '價格' : r.label}
          </option>
        ))}
      </select>

      {/* Distance dropdown — only if user has location */}
      {hasUserLocation && (
        <select
          value={activeDistIdx === -1 ? 0 : activeDistIdx}
          onChange={handleDistanceSelect}
          className="h-8 rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground"
        >
          {DISTANCE_PRESETS.map((d, i) => (
            <option key={i} value={i}>
              {i === 0 ? '距離' : d.label}
            </option>
          ))}
        </select>
      )}

      <div className="flex-1" />

      {/* Edit request link */}
      <button
        onClick={() => router.push(`/book?${wizardParams}`)}
        className="text-xs font-medium text-foreground underline"
      >
        編輯需求
      </button>
    </div>
  )
}
