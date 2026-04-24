// myApp/lib/slots-api.ts
import type { SlotItem } from '@/types/pro'
import { deriveSlotState } from './pro-helpers'

const USE_MOCK = true

// ── Mock data ──────────────────────────────────────────────────
// Store slot open/closed state in memory for mock toggle behavior.
const mockOpenSlots = new Set<string>()
const mockBookedSlots = new Set<string>()

function generateSlots(): { startsAt: string; isOpen: boolean; isBooked: boolean }[] {
  const slots: { startsAt: string; isOpen: boolean; isBooked: boolean }[] = []
  const base = new Date()
  base.setMinutes(0, 0, 0)

  for (let day = 0; day < 3; day++) {
    const dayStart = new Date(base)
    dayStart.setDate(dayStart.getDate() + day)
    dayStart.setHours(11, 0, 0, 0)

    for (let slot = 0; slot < 37; slot++) { // 11:00 – 20:00, 15-min each
      const t = new Date(dayStart.getTime() + slot * 15 * 60_000)
      const iso = t.toISOString()
      // Pre-seed some open and booked slots for visual variety
      const isBooked = [2, 7, 15, 23].includes(slot) && day === 0
      const isOpen   = [3, 4, 9, 18, 25].includes(slot) && !isBooked
      if (isOpen)   mockOpenSlots.add(iso)
      if (isBooked) mockBookedSlots.add(iso)
      slots.push({ startsAt: iso, isOpen, isBooked })
    }
  }
  return slots
}

// Generate once at module load
const MOCK_SLOT_DATA = generateSlots()

// ── API ────────────────────────────────────────────────────────

export async function fetchSlots(): Promise<SlotItem[]> {
  if (!USE_MOCK) return [] // TODO: real Supabase query

  const now = new Date()
  return MOCK_SLOT_DATA.map(({ startsAt }) => ({
    starts_at: startsAt,
    state: deriveSlotState(
      startsAt,
      mockOpenSlots.has(startsAt),
      mockBookedSlots.has(startsAt),
      now
    ),
  }))
}

export async function openSlot(startsAt: string): Promise<void> {
  if (USE_MOCK) { mockOpenSlots.add(startsAt); return }
  // TODO: INSERT into availability_slots
}

export async function closeSlot(startsAt: string): Promise<void> {
  if (USE_MOCK) { mockOpenSlots.delete(startsAt); return }
  // TODO: DELETE from availability_slots
}
