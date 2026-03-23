'use client'

import { useState, useMemo } from 'react'
import ProCard from './ProCard'
import SearchFilters from './SearchFilters'

export type SlotInfo = {
  id: string
  startsAt: string
  durationMinutes: number
}

export type ProResult = {
  proId: string
  displayName: string
  profilePhotoUrl: string | null
  studioAddress: string
  district: string
  distanceKm: number | null
  availableSlotCount: number
  slots: SlotInfo[]
  startingPrice: number
  portfolioPhotos: string[]
  averageRating: number | null
  ratingCount: number
}

type Props = {
  pros: ProResult[]
  fallbackTier: 'exact' | 'closest' | 'none'
  hasUserLocation: boolean
  wizardParams: string
}

export default function SearchResultsList({ pros, fallbackTier, hasUserLocation, wizardParams }: Props) {
  const [minPrice, setMinPrice] = useState<number | null>(null)
  const [maxPrice, setMaxPrice] = useState<number | null>(null)
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(null)

  const filtered = useMemo(() => {
    let result = pros
    if (minPrice !== null) {
      result = result.filter(p => p.startingPrice >= minPrice)
    }
    if (maxPrice !== null) {
      result = result.filter(p => p.startingPrice <= maxPrice)
    }
    if (maxDistanceKm !== null && hasUserLocation) {
      result = result.filter(p => p.distanceKm !== null && p.distanceKm <= maxDistanceKm)
    }
    return result
  }, [pros, minPrice, maxPrice, maxDistanceKm, hasUserLocation])

  return (
    <>
      {/* Filters */}
      <div className="px-5 pb-4">
        <SearchFilters
          minPrice={minPrice}
          maxPrice={maxPrice}
          maxDistanceKm={maxDistanceKm}
          hasUserLocation={hasUserLocation}
          wizardParams={wizardParams}
          onPriceChange={(min, max) => { setMinPrice(min); setMaxPrice(max) }}
          onDistanceChange={setMaxDistanceKm}
        />
      </div>

      {/* Fallback message */}
      {fallbackTier === 'closest' && (
        <div className="mx-5 mb-3 rounded-xl bg-warning-muted px-4 py-3">
          <p className="text-xs text-warning-foreground">
            找不到完全符合條件的設計師，以下是最接近你要求的美業老師
          </p>
        </div>
      )}

      {/* Results */}
      <div className="px-5 pb-12 space-y-3">
        <p className="text-xs text-muted-foreground">
          {filtered.length > 0
            ? `${filtered.length} 位設計師可預約`
            : '沒有符合條件的設計師'}
        </p>
        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-secondary px-5 py-8 text-center">
            <p className="text-sm font-medium text-foreground">
              {fallbackTier === 'none'
                ? '目前沒有可預約的設計師'
                : '沒有符合篩選條件的設計師'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              請稍後再試，或調整篩選條件
            </p>
          </div>
        ) : (
          filtered.map(p => (
            <ProCard
              key={p.proId}
              pro={p}
              wizardParams={wizardParams}
            />
          ))
        )}
      </div>
    </>
  )
}
