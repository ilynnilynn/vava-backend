'use client'

import { useState, useTransition } from 'react'
import type { Slot } from '@/types'
import { cn } from '@/lib/utils'
import { addSlotAction, removeSlotAction } from '@/app/(pro)/dashboard/actions'

// ── Constants (mirrored from lib/slots — can't import server module in client)
const SLOT_WINDOW_HOURS = 72
const SLOT_INCREMENT_MINS = 15

function generateSlotOptions(date: Date): Date[] {
  const slots: Date[] = []
  const now = new Date()
  const maxTime = new Date(now.getTime() + SLOT_WINDOW_HOURS * 60 * 60 * 1000)

  const cursor = new Date(date)
  cursor.setHours(0, 0, 0, 0)

  const end = new Date(date)
  end.setHours(23, 59, 0, 0)

  while (cursor <= end) {
    if (cursor > now && cursor <= maxTime) {
      slots.push(new Date(cursor))
    }
    cursor.setTime(cursor.getTime() + SLOT_INCREMENT_MINS * 60 * 1000)
  }

  return slots
}

// ── Helpers ─────────────────────────────────────────────────

function formatTime(date: Date) {
  return date.toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatDateHeader(date: Date) {
  return date.toLocaleDateString('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  })
}

function getDaysInWindow(): Date[] {
  const days: Date[] = []
  const now = new Date()
  for (let i = 0; i < 4; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() + i)
    d.setHours(0, 0, 0, 0)
    days.push(d)
  }
  return days
}

// ── Types ───────────────────────────────────────────────────

type SlotState = 'past' | 'available' | 'open' | 'booked'

function getSlotState(time: Date, existingSlot: Slot | undefined): SlotState {
  if (time.getTime() < Date.now()) return 'past'
  if (!existingSlot) return 'available'
  if (existingSlot.is_booked) return 'booked'
  return 'open'
}

const stateStyles: Record<SlotState, string> = {
  past: 'bg-gray-100 text-gray-400 cursor-not-allowed',
  available: 'bg-white border hover:bg-gray-50 cursor-pointer',
  open: 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200 cursor-pointer',
  booked: 'bg-green-100 text-green-800 border-green-300 cursor-not-allowed',
}

const stateLabels: Record<SlotState, string> = {
  past: '',
  available: '',
  open: '開放',
  booked: '已預約',
}

// ── Component ───────────────────────────────────────────────

type Props = {
  initialSlots: Slot[]
  isReadOnly: boolean
}

export function SlotManager({ initialSlots, isReadOnly }: Props) {
  const [slots] = useState(initialSlots)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const days = getDaysInWindow()

  function findSlot(time: Date): Slot | undefined {
    return slots.find(
      (s) => new Date(s.starts_at).getTime() === time.getTime()
    )
  }

  function handleSlotTap(time: Date) {
    if (isPending) return

    const existing = findSlot(time)
    const state = getSlotState(time, existing)

    if (state === 'past' || state === 'booked') return
    if (state === 'available' && isReadOnly) return

    setError(null)

    startTransition(async () => {
      if (state === 'available') {
        // Add slot
        const result = await addSlotAction(time.toISOString())
        if (result.error) {
          setError(result.error)
        }
      } else if (state === 'open' && existing) {
        // Remove slot
        const result = await removeSlotAction(existing.id)
        if (result.error) {
          setError(result.error)
        }
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-gray-100 border" /> 已過
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-white border" /> 可開放
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-purple-100 border border-purple-300" /> 已開放
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-green-100 border border-green-300" /> 已預約
        </span>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Day sections */}
      {days.map((day) => {
        const options = generateSlotOptions(day)
        if (options.length === 0) return null

        return (
          <section key={day.toISOString()} className="space-y-2">
            <h3 className="text-sm font-medium">{formatDateHeader(day)}</h3>
            <div className="grid grid-cols-4 gap-2">
              {options.map((time) => {
                const existing = findSlot(time)
                const state = getSlotState(time, existing)
                return (
                  <button
                    key={time.toISOString()}
                    onClick={() => handleSlotTap(time)}
                    disabled={
                      isPending ||
                      state === 'past' ||
                      state === 'booked' ||
                      (state === 'available' && isReadOnly)
                    }
                    className={cn(
                      'rounded-md border px-2 py-1.5 text-xs font-medium transition-colors',
                      stateStyles[state],
                      isPending && 'opacity-50'
                    )}
                  >
                    {formatTime(time)}
                    {stateLabels[state] && (
                      <span className="block text-[10px] font-normal">
                        {stateLabels[state]}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
