// ============================================================
// FLAGS — flag creation and standing computation
//
// Standing is COMPUTED from flags, never stored directly.
// (Storing it is for fast querying — but computeStanding() is
// always the source of truth.)
// ============================================================

import { createClient } from '@/lib/supabase/server'
import type { Flag, FlagType, FlaggedEntity, ProStanding, Result } from '@/types/database'

// ── Create ────────────────────────────────────────────────────

// Write a flag. Call this after cancelBooking() or markNoShow().
export async function createFlag(params: {
  bookingId: string
  flaggedEntity: FlaggedEntity
  flaggedId: string
  flagType: FlagType
  isSameDay: boolean
  note?: string
}): Promise<Result<null>> {
  const supabase = await createClient()

  const { error } = await supabase.from('flags').insert({
    booking_id:      params.bookingId,
    flagged_entity:  params.flaggedEntity,
    flagged_id:      params.flaggedId,
    flag_type:       params.flagType,
    is_same_day:     params.isSameDay,
    note:            params.note ?? null,
  })

  return { data: null, error: error?.message ?? null }
}

// ── Determine flag type from cancellation context ─────────────

// Returns the flag type + same-day bool to use for a cancellation.
// Returns null if no flag should be applied (e.g. within grace period).
export function getCancellationFlag(params: {
  actor: 'customer' | 'pro'
  bookingStatus: string    // pass the status returned by cancelBooking()
  startsAt: string
}): { flagType: FlagType; isSameDay: boolean } | null {
  // Grace period = no flag
  if (params.bookingStatus === 'cancelled_grace') return null

  const minutesUntil = (new Date(params.startsAt).getTime() - Date.now()) / 60000
  const isSameDay    = new Date(params.startsAt).toDateString() === new Date().toDateString()

  // Pro cancel = always hard
  if (params.actor === 'pro') return { flagType: 'hard', isSameDay }

  // Customer cancel — severity by timing
  if (minutesUntil < 30)  return { flagType: 'hard', isSameDay: true }
  return { flagType: 'soft', isSameDay }
}

// ── Compute standing ──────────────────────────────────────────

// Compute standing from a flag list. Never read standing from the DB directly.
// Good:      0–1 soft, 0 hard
// Warning:   2+ soft OR 1 hard
// At Risk:   3+ soft OR 2+ hard OR 1 same-day
// Suspended: 2+ same-day OR 1 no_show (pro)
export function computeStanding(flags: Flag[]): ProStanding {
  const soft    = flags.filter(f => f.flag_type === 'soft').length
  const hard    = flags.filter(f => f.flag_type === 'hard').length
  const sameDay = flags.filter(f => f.is_same_day).length
  const noShow  = flags.filter(f => f.flag_type === 'no_show').length

  if (sameDay >= 2 || noShow >= 1)            return 'suspended'
  if (sameDay >= 1 || soft >= 3 || hard >= 2) return 'at_risk'
  if (soft >= 2 || hard >= 1)                 return 'warning'
  return 'good'
}

// ── Read ──────────────────────────────────────────────────────

export async function getFlagsForEntity(flaggedId: string): Promise<Flag[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('flags')
    .select('*')
    .eq('flagged_id', flaggedId)
    .order('created_at', { ascending: false })
  return data ?? []
}

// Compute + sync standing back to pros table after a flag is created.
// Call this at the end of any flow that creates a flag.
export async function syncProStanding(proId: string): Promise<void> {
  const flags    = await getFlagsForEntity(proId)
  const standing = computeStanding(flags)
  const supabase = await createClient()
  await supabase.from('pros').update({ standing }).eq('id', proId)
}
