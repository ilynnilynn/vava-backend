'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { ProResult, SlotInfo } from './SearchResultsList'

type Props = {
  pro: ProResult
  wizardParams: string
  expanded: boolean
  onToggle: () => void
}

function formatSlotTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatSlotDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function ProCard({ pro, wizardParams, expanded, onToggle }: Props) {
  const router = useRouter()
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null)
  const [mountTime] = useState(Date.now)

  function handleConfirm() {
    if (!selectedSlot) return
    const params = new URLSearchParams(wizardParams)
    params.set('proId', pro.proId)
    params.set('slotId', selectedSlot.id)
    params.set('startsAt', selectedSlot.startsAt)
    params.set('durationMinutes', String(selectedSlot.durationMinutes))
    router.push(`/book/confirm?${params.toString()}`)
  }

  // Filter out past slots, then group by date
  const { futureSlots, slotsByDate } = useMemo(() => {
    const future = pro.slots.filter(s => new Date(s.startsAt).getTime() > mountTime)
    const byDate = new Map<string, SlotInfo[]>()
    for (const slot of future) {
      const dateKey = formatSlotDate(slot.startsAt)
      const existing = byDate.get(dateKey) ?? []
      existing.push(slot)
      byDate.set(dateKey, existing)
    }
    return { futureSlots: future, slotsByDate: byDate }
  }, [pro.slots, mountTime])

  return (
    <div
      className={`rounded-2xl border bg-card transition-all ${
        expanded ? 'border-foreground/30' : 'border-border'
      }`}
    >
      {/* Collapsed header — always visible */}
      <button
        onClick={() => {
          if (expanded) setSelectedSlot(null)
          onToggle()
        }}
        className="w-full text-left p-4"
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

            {/* Portfolio preview (collapsed only) */}
            {!expanded && pro.portfolioPhotos.length > 0 && (
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {pro.portfolioPhotos.slice(0, 4).map((url, i) => (
                  <div key={i} className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
                    <img src={url} alt={`${pro.displayName} 作品 ${i + 1}`} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            {/* Slots + price summary */}
            <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{pro.availableSlotCount} 個可預約時段</span>
              <span className="text-foreground font-medium">
                NT${pro.startingPrice.toLocaleString()} 起
              </span>
            </div>
          </div>
        </div>
      </button>

      {/* Expanded section */}
      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
          {/* Portfolio photos — larger */}
          {pro.portfolioPhotos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {pro.portfolioPhotos.map((url, i) => (
                <div key={i} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-secondary">
                  <img src={url} alt={`作品 ${i + 1}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {/* Available slots */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">可預約時段</p>
            {futureSlots.length === 0 ? (
              <p className="text-xs text-muted-foreground">目前沒有可預約的時段</p>
            ) : (
              <div className="space-y-3">
                {Array.from(slotsByDate.entries()).map(([date, dateSlots]) => (
                  <div key={date}>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">{date}</p>
                    <div className="flex flex-wrap gap-2">
                      {dateSlots.map(slot => {
                        const isSelected = selectedSlot?.id === slot.id
                        return (
                          <button
                            key={slot.id}
                            onClick={() => setSelectedSlot(isSelected ? null : slot)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                              isSelected
                                ? 'border-foreground bg-foreground text-primary-foreground'
                                : 'border-border bg-card text-foreground hover:border-foreground/30'
                            }`}
                          >
                            {formatSlotTime(slot.startsAt)}
                            {isSelected && (
                              <span className="ml-1 text-primary-foreground/70">
                                ({slot.durationMinutes}分鐘)
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CTA */}
          <Button
            onClick={handleConfirm}
            disabled={!selectedSlot}
            className="h-12 w-full rounded-2xl text-sm font-semibold"
          >
            保留時段
          </Button>
        </div>
      )}
    </div>
  )
}
