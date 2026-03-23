'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { ProResult, SlotInfo } from './SearchResultsList'

type Props = {
  pro: ProResult
  wizardParams: string
  onClose: () => void
}

function formatSlotTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatSlotDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function ProCardExpanded({ pro, wizardParams, onClose }: Props) {
  const router = useRouter()
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null)

  function handleConfirm() {
    if (!selectedSlot) return
    const params = new URLSearchParams(wizardParams)
    params.set('proId', pro.proId)
    params.set('slotId', selectedSlot.id)
    params.set('startsAt', selectedSlot.startsAt)
    params.set('durationMinutes', String(selectedSlot.durationMinutes))
    router.push(`/book/confirm?${params.toString()}`)
  }

  // Group slots by date
  const slotsByDate = new Map<string, SlotInfo[]>()
  for (const slot of pro.slots) {
    const dateKey = formatSlotDate(slot.startsAt)
    const existing = slotsByDate.get(dateKey) ?? []
    existing.push(slot)
    slotsByDate.set(dateKey, existing)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div className="flex-1 bg-foreground/30" onClick={onClose} />

      {/* Bottom sheet */}
      <div className="bg-background rounded-t-3xl max-h-[75vh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {/* Pro info */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-secondary">
              {pro.profilePhotoUrl ? (
                <img
                  src={pro.profilePhotoUrl}
                  alt={pro.displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
                  {pro.displayName.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <p className="text-base font-bold text-foreground">{pro.displayName}</p>
              <p className="text-xs text-muted-foreground">
                {pro.district}
                {pro.distanceKm !== null && ` · ${pro.distanceKm < 1 ? `${Math.round(pro.distanceKm * 1000)}m` : `${pro.distanceKm.toFixed(1)}km`}`}
              </p>
            </div>
          </div>

          {/* Portfolio photos */}
          {pro.portfolioPhotos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto mb-5">
              {pro.portfolioPhotos.map((url, i) => (
                <div key={i} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-secondary">
                  <img src={url} alt={`作品 ${i + 1}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {/* Available slots */}
          <h3 className="text-sm font-semibold text-foreground mb-3">可預約時段</h3>

          {pro.slots.length === 0 ? (
            <p className="text-xs text-muted-foreground">目前沒有可預約的時段</p>
          ) : (
            <div className="space-y-4">
              {Array.from(slotsByDate.entries()).map(([date, dateSlots]) => (
                <div key={date}>
                  <p className="text-xs font-medium text-muted-foreground mb-2">{date}</p>
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
        <div className="border-t border-border p-5">
          <Button
            onClick={handleConfirm}
            disabled={!selectedSlot}
            className="h-14 w-full rounded-2xl text-base font-semibold"
          >
            保留時段
          </Button>
        </div>
      </div>
    </div>
  )
}
