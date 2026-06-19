// myApp/lib/slots-api.ts
import { supabase } from './supabase'
import type { SlotItem } from '@/types/pro'
import { deriveSlotState } from './pro-helpers'

const USE_MOCK = false

// START_HOUR / END_HOUR used only for mock data generation.
// Real fetchSlots() returns DB rows only; slots.tsx builds the UI grid dynamically.
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

// ── Helpers ────────────────────────────────────────────────────

/**
 * Returns the pros.id for the logged-in user.
 * slots.pro_id references pros.id (auto-generated UUID), NOT auth.uid().
 * The link is: pros.user_id = auth.uid().
 */
async function getAuthProId(authUserId: string): Promise<string | null> {
  const { data } = await supabase
    .from('pros')
    .select('id')
    .eq('user_id', authUserId)
    .maybeSingle()
  return data?.id ?? null
}

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
  if (!session) return []

  const now = new Date()
  const todayMidnight = new Date(now)
  todayMidnight.setHours(0, 0, 0, 0)

  const windowEnd = new Date(todayMidnight)
  windowEnd.setDate(windowEnd.getDate() + 3)

  const proId = await getAuthProId(session.user.id)
  console.log('[slots-api] fetchSlots proId:', proId,
    'window:', todayMidnight.toISOString(), '→', windowEnd.toISOString())
  if (!proId) return []

  const { data, error } = await supabase
    .from('slots')
    .select('starts_at, is_booked')
    .eq('pro_id', proId)
    .gte('starts_at', todayMidnight.toISOString())
    .lt('starts_at', windowEnd.toISOString())

  if (error) throw error

  console.log('[slots-api] fetchSlots DB rows:', JSON.stringify(data))

  // Return DB rows only — slots.tsx daySlots IIFE fills the full UI grid with synthetic
  // 'available'/'expired' slots for positions not in the DB. This means slots at any hour
  // (including outside the old hardcoded 11-20 range) persist correctly after reload.
  const result: SlotItem[] = []
  for (const row of data ?? []) {
    // Normalize: Supabase/PostgREST may omit timezone suffix on some configs.
    // Without 'Z' or '+HH:MM', Hermes parses as LOCAL time → wrong timestamp.
    const rawStr: string = row.starts_at
    const normalized = /[Zz]$/.test(rawStr) || /[+-]\d{2}:\d{2}$/.test(rawStr)
      ? rawStr
      : rawStr + 'Z'
    const iso = new Date(normalized).toISOString()
    result.push({
      starts_at: iso,
      state: deriveSlotState(iso, !row.is_booked, row.is_booked, now),
    })
  }

  console.log('[slots-api] fetchSlots returning', result.length, 'rows')
  return result
}

export async function openSlot(startsAt: string): Promise<void> {
  if (USE_MOCK) { mockOpenSlots.add(startsAt); return }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const proId = await getAuthProId(session.user.id)
  if (!proId) throw new Error('Pro profile not found — complete onboarding first')

  console.log('[slots-api] openSlot proId:', proId, 'startsAt:', startsAt, 'ms:', new Date(startsAt).getTime())

  const { data, error } = await supabase
    .from('slots')
    .upsert(
      { pro_id: proId, starts_at: startsAt, is_booked: false, is_expired: false },
      { onConflict: 'pro_id,starts_at' }
    )
    .select('id, pro_id, starts_at, is_booked, is_expired')

  console.log('[slots-api] openSlot upsert result:', JSON.stringify(data), 'error:', error?.message)
  if (error) throw error

  // Detect silent RLS rejection: Supabase returns { data: [], error: null } when
  // the write is blocked by RLS policy without raising a DB error.
  if (!data || data.length === 0) {
    throw new Error('寫入失敗 (RLS 阻擋或約束錯誤) — 請確認帳號已完成 Pro 設定')
  }
  console.log('[slots-api] openSlot confirmed row:', JSON.stringify(data[0]))

  // Immediate readback — verify the row is readable from DB right after write
  const { data: readBack, error: readErr } = await supabase
    .from('slots')
    .select('pro_id, starts_at, is_booked')
    .eq('pro_id', proId)
    .eq('starts_at', startsAt)
  console.log('[slots-api] openSlot readback:', JSON.stringify(readBack), 'err:', readErr?.message)
  if (!readBack || readBack.length === 0) {
    console.error('[slots-api] openSlot READBACK FAILED — row written but not immediately readable. Check RLS SELECT policy.')
  } else {
    console.log('[slots-api] openSlot readback starts_at raw:', readBack[0].starts_at)
  }
}

export async function closeSlot(startsAt: string): Promise<void> {
  if (USE_MOCK) { mockOpenSlots.delete(startsAt); return }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const proId = await getAuthProId(session.user.id)
  if (!proId) throw new Error('Pro profile not found')

  const { error } = await supabase
    .from('slots')
    .delete()
    .eq('pro_id', proId)
    .eq('starts_at', startsAt)
    .eq('is_booked', false)  // Safety: never delete a booked slot

  if (error) throw error
}
