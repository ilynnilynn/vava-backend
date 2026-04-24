'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { Slot } from '@/types/database'

type Props = {
  bookingId: string
  slots: Slot[]
}

function formatSlotTime(startsAt: string): string {
  return new Date(startsAt).toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function groupSlotsByDate(slots: Slot[]): Map<string, Slot[]> {
  const grouped = new Map<string, Slot[]>()
  for (const slot of slots) {
    const dateKey = new Date(slot.starts_at).toLocaleDateString('zh-TW', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    })
    const existing = grouped.get(dateKey) ?? []
    existing.push(slot)
    grouped.set(dateKey, existing)
  }
  return grouped
}

export default function RescheduleSlotPicker({ bookingId, slots }: Props) {
  const router = useRouter()
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const grouped = groupSlotsByDate(slots)

  async function handleSubmit() {
    if (!selectedSlotId || submitting) return
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/bookings/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, newSlotId: selectedSlotId }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? '申請失敗，請稍後再試')
        setSubmitting(false)
        return
      }

      router.push(`/bookings/${bookingId}`)
      router.refresh()
    } catch {
      setError('網路錯誤，請稍後再試')
      setSubmitting(false)
    }
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-2xl bg-secondary px-5 py-8 text-center">
        <p className="text-sm font-medium text-foreground">目前沒有其他可預約的時段</p>
        <p className="mt-1 text-xs text-muted-foreground">設計師尚未開放其他時段</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">選擇新時段</h2>
        {Array.from(grouped.entries()).map(([dateLabel, dateSlots]) => (
          <div key={dateLabel} className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{dateLabel}</p>
            <div className="flex flex-wrap gap-2">
              {dateSlots.map(slot => (
                <button
                  key={slot.id}
                  onClick={() => setSelectedSlotId(slot.id)}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                    selectedSlotId === slot.id
                      ? 'border-foreground bg-foreground text-primary-foreground'
                      : 'border-border bg-card text-foreground hover:border-foreground/30'
                  }`}
                >
                  {formatSlotTime(slot.starts_at)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        onClick={handleSubmit}
        disabled={!selectedSlotId || submitting}
        className="h-12 w-full rounded-2xl text-base font-semibold"
      >
        {submitting ? '申請中...' : '送出改期申請'}
      </Button>
    </div>
  )
}
