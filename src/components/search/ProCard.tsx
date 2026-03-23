'use client'

import { useState } from 'react'
import type { ProResult } from './SearchResultsList'
import ProCardExpanded from './ProCardExpanded'

type Props = {
  pro: ProResult
  wizardParams: string
}

export default function ProCard({ pro, wizardParams }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <button
        onClick={() => setExpanded(true)}
        className="w-full text-left rounded-2xl border border-border bg-card p-4 transition-colors hover:border-foreground/20"
      >
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-secondary">
            {pro.profilePhotoUrl ? (
              <img
                src={pro.profilePhotoUrl}
                alt={pro.displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted-foreground">
                {pro.displayName.charAt(0)}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-base font-semibold text-foreground">
                {pro.displayName}
              </p>
              {pro.averageRating !== null && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  <span className="text-star">★</span> {pro.averageRating} ({pro.ratingCount})
                </span>
              )}
            </div>

            {/* District + distance */}
            <p className="truncate text-xs text-muted-foreground">
              {pro.district}
              {pro.distanceKm !== null && ` · ${pro.distanceKm < 1 ? `${Math.round(pro.distanceKm * 1000)}m` : `${pro.distanceKm.toFixed(1)}km`}`}
            </p>

            {/* Portfolio photos (swipeable) */}
            {pro.portfolioPhotos.length > 0 && (
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {pro.portfolioPhotos.slice(0, 4).map((url, i) => (
                  <div key={i} className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
                    <img src={url} alt={`${pro.displayName} 作品 ${i + 1}`} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            {/* Slots + price */}
            <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{pro.availableSlotCount} 個可預約時段</span>
              <span className="text-foreground font-medium">
                NT${pro.startingPrice.toLocaleString()} 起
              </span>
            </div>
          </div>
        </div>
      </button>

      {/* Expanded bottom sheet */}
      {expanded && (
        <ProCardExpanded
          pro={pro}
          wizardParams={wizardParams}
          onClose={() => setExpanded(false)}
        />
      )}
    </>
  )
}
