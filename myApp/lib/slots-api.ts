// myApp/lib/slots-api.ts
import { supabase } from './supabase'
import type { SlotItem } from '@/types/pro'
import { deriveSlotState } from './pro-helpers'

const USE_MOCK = false

// These must stay in sync with START_HOUR / END_HOUR in app/(pro-tabs)/slots.tsx
const START_HOUR = 11
const END_HOUR = 20

// ── Mock data ──────────────────────────────────────────────────
const mockOpenSlots = new Set<string>()
const mockBookedSlots = new Set<string>()

function generateMockSlots(): { startsAt: string; isOpen: boolean; isBooked: boolean }[] {
  const slots: { startsAt: string; isOpen: boolean; isBooked: boolean }[] = []
  const base = new Date()
  base.setHours(0, 0, 0, 0)

  for (let day = 0; day < 3; day++) {
    const d = new Date(base)
    d.setDate(d.getDate() + day)

    for (let h = START_HOUR; h <= END_HOUR; h++) {
      const minutes = h < END_HOUR ? [0, 30] : [0]
      for (const m of minutes) {
        d.setHours(h, m, 0, 0)
        const iso = d.toISOString()
        const idx = (h - START_HOUR) * 2 + (m === 30 ? 1 : 0)
        const isBooked = ([2, 7, 15, 23].includes(idx) && day === 0) || ([4, 12, 20].includes(idx) && day === 1)
        const isOpen = [3, 4, 9, 18, 25].includes(idx) && !isBooked
        if (isOpen) mockOpenSlots.add(iso)
        if (isBooked) mockBookedSlots.add(iso)
        slots.push({ startsAt: iso, isOpen, isBooked })
      }
    }
  }
  return slots
}

const MOCK_SLOT_DATA = generateMockSlots()

// ── API ────────────────────────────────────────────────────────

export async function fetchSlots(): Promise<SlotItem[]> {
  if (USE_MOCK) {
    const now = new Date()
    return MOCK_SLOT_DATA.map(({ startsAt }) => ({
      starts_at: startsAt,
      state: deriveSlotState(startsAt, mockOpenSlots.has(startsAt), mockBookedSlots.has(startsAt), now),
    }))
  }

  const { data: { session } } = await supabase.auth.getSession()

  const now = new Date()
  const todayMidnight = new Date(now)
  todayMidnight.setHours(0, 0, 0, 0)

  const windowEnd = new Date(todayMidnight)
  windowEnd.setDate(windowEnd.getDate() + 3)

  // Key by ms timestamp — avoids string format mismatches between client and DB
  const slotMap = new Map<number, { isBooked: boolean }>()

  if (session) {
    // Authenticated: fetch this pro's real slot data
    const { data, error } = await supabase
      .from('slots')
      .select('starts_at, is_booked')
      .eq('pro_id', session.user.id)
      .gte('starts_at', todayMidnight.toISOString())
      .lt('starts_at', windowEnd.toISOString())

    if (error) throw error

    for (const row of data ?? []) {
      slotMap.set(new Date(row.starts_at).getTime(), { isBooked: row.is_booked })
    }
  }
  // No session: slotMap stays empty — all slots will derive as 'available' or 'expired'

  // Generate full 3-day grid matching what the UI displays
  const result: SlotItem[] = []
  for (let day = 0; day < 3; day++) {
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      const minutes = h < END_HOUR ? [0, 30] : [0]
      for (const m of minutes) {
        const t = new Date(todayMidnight)
        t.setDate(t.getDate() + day)
        t.setHours(h, m, 0, 0)

        const match = slotMap.get(t.getTime()) ?? null
        const iso = t.toISOString()

        result.push({
          starts_at: iso,
          state: deriveSlotState(
            iso,
            match !== null && !match.isBooked,
            match?.isBooked ?? false,
            now
          ),
        })
      }
    }
  }

  return result
}

export async function openSlot(startsAt: string): Promise<void> {
  if (USE_MOCK) { mockOpenSlots.add(startsAt); return }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('slots')
    .upsert(
      { pro_id: session.user.id, starts_at: startsAt, is_booked: false, is_expired: false },
      { onConflict: 'pro_id,starts_at' }
    )

  if (error) throw error
}

export async function closeSlot(startsAt: string): Promise<void> {
  if (USE_MOCK) { mockOpenSlots.delete(startsAt); return }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('slots')
    .delete()
    .eq('pro_id', session.user.id)
    .eq('starts_at', startsAt)
    .eq('is_booked', false)  // Safety: never delete a booked slot

  if (error) throw error
}
