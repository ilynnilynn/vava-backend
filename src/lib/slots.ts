// ============================================================
// SLOTS — all slot operations
//
// Rule: import this file everywhere you need slot logic.
// Never write slot queries directly in components or pages.
// ============================================================

import { createClient } from '@/lib/supabase/server'
import type { Slot, Result } from '@/types/database'

// ── Constants ────────────────────────────────────────────────

export const SLOT_WINDOW_HOURS     = 72   // locked — see Strategy & Decision Log
export const SLOT_INCREMENT_MINS   = 15   // locked — 15-minute increments

// ── Write ─────────────────────────────────────────────────────

// Add a single slot for a pro.
// Validates: within 72hr window, on a 15-min boundary.
export async function addSlot(
  proId: string,
  startsAt: string  // ISO timestamp
): Promise<Result<Slot>> {
  const supabase = await createClient()

  const start  = new Date(startsAt)
  const now    = new Date()
  const maxTime = new Date(now.getTime() + SLOT_WINDOW_HOURS * 60 * 60 * 1000)

  if (start <= now)    return { data: null, error: 'Slot must be in the future' }
  if (start > maxTime) return { data: null, error: `Slot must be within ${SLOT_WINDOW_HOURS} hours` }

  // Validate 15-min boundary
  const mins = start.getMinutes()
  if (mins % SLOT_INCREMENT_MINS !== 0) {
    return { data: null, error: `Slot must start on a ${SLOT_INCREMENT_MINS}-minute boundary (e.g. :00, :15, :30, :45)` }
  }

  const { data, error } = await supabase
    .from('slots')
    .insert({ pro_id: proId, starts_at: startsAt, is_booked: false, is_expired: false })
    .select()
    .single()

  return { data, error: error?.message ?? null }
}

// Remove a slot. Blocked if is_booked — pro must cancel the booking first.
export async function removeSlot(slotId: string): Promise<Result<null>> {
  const supabase = await createClient()

  const { data: slot } = await supabase
    .from('slots')
    .select('is_booked')
    .eq('id', slotId)
    .single()

  if (!slot)          return { data: null, error: 'Slot not found' }
  if (slot.is_booked) return { data: null, error: 'Cannot remove a booked slot — cancel the booking first' }

  await supabase.from('slots').delete().eq('id', slotId)
  return { data: null, error: null }
}

// ── Read ──────────────────────────────────────────────────────

// All open slots for a pro within 72hr window (for pro dashboard).
export async function getProSlots(proId: string): Promise<Slot[]> {
  const supabase = await createClient()
  const now      = new Date().toISOString()
  const maxTime  = new Date(Date.now() + SLOT_WINDOW_HOURS * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('slots')
    .select('*')
    .eq('pro_id', proId)
    .eq('is_expired', false)
    .gte('starts_at', now)
    .lte('starts_at', maxTime)
    .order('starts_at', { ascending: true })

  return data ?? []
}

// Open (not booked, not expired) slots for a pro within 72hr — for customer browse.
export async function getProAvailableSlots(proId: string): Promise<Slot[]> {
  const supabase = await createClient()
  const now      = new Date().toISOString()
  const maxTime  = new Date(Date.now() + SLOT_WINDOW_HOURS * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('slots')
    .select('*')
    .eq('pro_id', proId)
    .eq('is_booked', false)
    .eq('is_expired', false)
    .gte('starts_at', now)
    .lte('starts_at', maxTime)
    .order('starts_at', { ascending: true })

  return data ?? []
}

// ── Cron ──────────────────────────────────────────────────────

// Mark slots as expired when starts_at has passed. Called by scheduled job.
export async function expireStaleSlots(): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('slots')
    .update({ is_expired: true })
    .lt('starts_at', new Date().toISOString())
    .eq('is_expired', false)
}

// ── UI helper ─────────────────────────────────────────────────

// Generate valid 15-min slot start times for a given day.
// Used to populate the time picker in the pro dashboard.
// Returns only future times within the 72hr window.
export function generateSlotOptions(date: Date): Date[] {
  const slots: Date[] = []
  const now     = new Date()
  const maxTime = new Date(now.getTime() + SLOT_WINDOW_HOURS * 60 * 60 * 1000)

  // Start at midnight of the given day
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

// Format a slot time for display: "3:30 PM" or "15:30" depending on locale
export function formatSlotTime(startsAt: string, locale: 'zh' | 'en' = 'zh'): string {
  const date = new Date(startsAt)
  return date.toLocaleTimeString(locale === 'zh' ? 'zh-TW' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: locale === 'en',
  })
}
