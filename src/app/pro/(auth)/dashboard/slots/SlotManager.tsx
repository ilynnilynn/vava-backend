'use client'

import { useMemo, useState, useTransition } from 'react'
import { Plus, X } from 'lucide-react'
import type { Slot } from '@/types'
import type { AvailabilityBlock } from '@/lib/slots'
import { cn } from '@/lib/utils'
import { addBlockAction, removeBlockAction } from '../actions'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'

// ── Constants ────────────────────────────────────────────────

const SLOT_INCREMENT_MINS = 30

// ── Helpers ──────────────────────────────────────────────────

function toHHmm(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
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
  for (let i = 0; i < 3; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() + i)
    d.setHours(0, 0, 0, 0)
    days.push(d)
  }
  return days
}

function generateTimeOptions(startHour: number, endHour: number): string[] {
  const options: string[] = []
  let mins = startHour * 60
  const endMins = endHour * 60
  while (mins <= endMins) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    mins += SLOT_INCREMENT_MINS
  }
  return options
}

// Reconstruct blocks from raw slots (client-side mirror of lib function)
function reconstructBlocks(slots: Slot[]): Record<string, AvailabilityBlock[]> {
  if (slots.length === 0) return {}

  const sorted = [...slots].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  )

  const result: Record<string, AvailabilityBlock[]> = {}
  const incrementMs = SLOT_INCREMENT_MINS * 60 * 1000

  for (const slot of sorted) {
    const slotDate = new Date(slot.starts_at)
    const dateKey = toDateKey(slotDate)
    const timeStr = toHHmm(slotDate)
    const isBooked = slot.is_booked

    if (!result[dateKey]) result[dateKey] = []
    const blocks = result[dateKey]
    const lastBlock = blocks[blocks.length - 1]

    if (lastBlock && lastBlock.isBooked === isBooked) {
      const [eh, em] = lastBlock.endTime.split(':').map(Number)
      const lastEndMs = new Date(slotDate)
      lastEndMs.setHours(eh, em, 0, 0)

      if (Math.abs(slotDate.getTime() - lastEndMs.getTime()) < 1000) {
        const slotEnd = new Date(slotDate.getTime() + incrementMs)
        lastBlock.endTime = toHHmm(slotEnd)
        lastBlock.slotIds.push(slot.id)
        continue
      }
    }

    const slotEnd = new Date(slotDate.getTime() + incrementMs)
    blocks.push({
      startTime: timeStr,
      endTime: toHHmm(slotEnd),
      isBooked,
      slotIds: [slot.id],
    })
  }

  return result
}

// ── Component ────────────────────────────────────────────────

type Props = {
  proId: string
  initialSlots: Slot[]
  isReadOnly: boolean
  workStartHour: number
  workEndHour: number
}

export function SlotManager({ proId, initialSlots, isReadOnly, workStartHour, workEndHour }: Props) {
  const [slots, setSlots] = useState(initialSlots)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Bottom sheet state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetDate, setSheetDate] = useState<Date | null>(null)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  const days = getDaysInWindow()
  const timeOptions = useMemo(
    () => generateTimeOptions(workStartHour, workEndHour),
    [workStartHour, workEndHour]
  )

  const blocksByDay = useMemo(() => reconstructBlocks(slots), [slots])

  function openSheet(day: Date) {
    setSheetDate(day)
    setStartTime(timeOptions[0] ?? '')
    setEndTime(timeOptions[1] ?? '')
    setError(null)
    setSheetOpen(true)
  }

  function handleAddBlock() {
    if (!sheetDate || !startTime || !endTime) return
    const dateKey = toDateKey(sheetDate)

    // Optimistic: create temp slots for immediate display
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    const startMins = sh * 60 + sm
    const endMins = eh * 60 + em
    const tempSlots: Slot[] = []
    let cursor = startMins
    while (cursor < endMins) {
      const h = Math.floor(cursor / 60)
      const m = cursor % 60
      const slotDate = new Date(`${dateKey}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`)
      tempSlots.push({
        id: `temp-${cursor}`,
        pro_id: proId,
        starts_at: slotDate.toISOString(),
        ends_at: null,
        is_booked: false,
        is_expired: false,
        created_at: new Date().toISOString(),
      })
      cursor += SLOT_INCREMENT_MINS
    }

    const prevSlots = slots
    setSlots(prev => [...prev, ...tempSlots])
    setSheetOpen(false)

    startTransition(async () => {
      const result = await addBlockAction(dateKey, startTime, endTime)
      if (result.error) {
        setSlots(prevSlots)
        setError(result.error)
      } else {
        setError(null)
      }
    })
  }

  function handleRemoveBlock(block: AvailabilityBlock) {
    const prevSlots = slots
    // Optimistic: remove these slot IDs
    const idsToRemove = new Set(block.slotIds)
    setSlots(prev => prev.filter(s => !idsToRemove.has(s.id)))

    startTransition(async () => {
      const result = await removeBlockAction(block.slotIds)
      if (result.error) {
        setSlots(prevSlots)
        setError(result.error)
      } else {
        setError(null)
      }
    })
  }

  // Filter end time options to be after start time
  const endTimeOptions = timeOptions.filter(t => t > startTime)

  // Validate add form
  const canAdd = startTime && endTime && endTime > startTime

  return (
    <div className="space-y-6">
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {days.map(day => {
        const dateKey = toDateKey(day)
        const blocks = blocksByDay[dateKey] ?? []

        return (
          <section key={dateKey} className="space-y-3">
            <h3 className="text-sm font-medium">{formatDateHeader(day)}</h3>

            {blocks.length === 0 && !isReadOnly && (
              <p className="text-xs text-muted-foreground">尚無可預約時段</p>
            )}

            {blocks.map((block, i) => (
              <div
                key={`${dateKey}-${block.startTime}-${i}`}
                className={cn(
                  'flex items-center justify-between rounded-lg px-4 py-3',
                  block.isBooked
                    ? 'bg-success-muted text-success-foreground'
                    : 'bg-primary text-primary-foreground'
                )}
              >
                <span className="text-sm font-medium">
                  {block.startTime} – {block.endTime}
                </span>
                {block.isBooked ? (
                  <span className="text-xs">已預約</span>
                ) : (
                  <button
                    onClick={() => handleRemoveBlock(block)}
                    disabled={isPending}
                    className="rounded-full p-1 hover:bg-white/20 transition-colors disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}

            {!isReadOnly && (
              <button
                onClick={() => openSheet(day)}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-lg border border-dashed px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                新增時段
              </button>
            )}
          </section>
        )
      })}

      {/* Add block bottom sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="text-left">
            <SheetTitle>新增可預約時段</SheetTitle>
            <SheetDescription>
              {sheetDate && formatDateHeader(sheetDate)}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">開始時間</label>
                <select
                  value={startTime}
                  onChange={e => {
                    setStartTime(e.target.value)
                    // Auto-advance end time if needed
                    if (endTime <= e.target.value) {
                      const nextIdx = timeOptions.indexOf(e.target.value) + 1
                      if (nextIdx < timeOptions.length) {
                        setEndTime(timeOptions[nextIdx])
                      }
                    }
                  }}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  {timeOptions.slice(0, -1).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">結束時間</label>
                <select
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  {endTimeOptions.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <Button
              onClick={handleAddBlock}
              disabled={!canAdd || isPending}
              className="w-full"
            >
              {isPending ? '新增中...' : '新增'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
