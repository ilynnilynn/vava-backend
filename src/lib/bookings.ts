// ============================================================
// BOOKINGS — all booking operations
//
// Rule: import this file everywhere you need booking logic.
// Never write booking queries directly in components or pages.
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Booking, BookingStatus, CancellationActor, Result } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

// ── Constants ────────────────────────────────────────────────

const GRACE_PERIOD_MS    = 10 * 60 * 1000   // 10 minutes
const HARD_FLAG_MINS     = 30               // < 30 min before = hard flag
const REMINDER_MINS      = 10              // reminder fires at -10 min

// ── Helpers ─────────────────────────────────────────────────

// starts_at lives on the slots table, not bookings.
// This helper enriches booking rows with starts_at from their associated slot.
async function enrichWithStartsAt(
  supabase: SupabaseClient,
  rows: Record<string, unknown>[]
): Promise<Booking[]> {
  if (!rows.length) return []
  const slotIds = [...new Set(rows.map(r => r.slot_id as string))]
  const { data: slots } = await supabase
    .from('slots')
    .select('id, starts_at')
    .in('id', slotIds)
  const slotMap = new Map((slots ?? []).map(s => [s.id, s.starts_at]))
  return rows.map(r => ({ ...r, starts_at: slotMap.get(r.slot_id as string) ?? '' }) as Booking)
}

// ── Confirm ──────────────────────────────────────────────────

export type ConfirmBookingParams = {
  userId: string
  proId: string
  slotId: string
  startsAt: string           // ISO timestamp
  durationMinutes: number    // total session duration
  noShowWindowMinutes: number // snapshot from pro.no_show_window
  priceMin: number
  priceMax: number
  serviceCategoryIds: string[]
  styleId?: string | null
  lashDensity?: Booking['lash_density']
  lashSpecialFiberTagId?: string | null
  lashStyleTags?: string[] | null
  addonIds?: string[] | null
  nailScope?: Booking['nail_scope']
  treatmentTier?: Booking['treatment_tier']
  fillInDays?: number | null
  isReturningCustomer?: boolean | null
  nailPackageId?: string | null
  preference?: string[] | null
  customerNote?: string | null
  briefingRefPhotoUrl?: string | null
}

// Locks a booking instantly (true instant confirm — no pro response window).
// Call this when customer taps 確認預約.
// After this: lock slot + send LINE notification to pro.
export async function confirmBooking(params: ConfirmBookingParams): Promise<Result<Booking>> {
  // Use admin client — caller (API route) has already verified auth
  const supabase = createAdminClient()

  const sessionEndsAt = new Date(
    new Date(params.startsAt).getTime() + params.durationMinutes * 60 * 1000
  ).toISOString()

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      user_id:                   params.userId,
      pro_id:                    params.proId,
      slot_id:                   params.slotId,
      service_category_ids:      params.serviceCategoryIds,
      style_id:                  params.styleId ?? null,
      lash_density:              params.lashDensity ?? null,
      lash_special_fiber_tag_id: params.lashSpecialFiberTagId ?? null,
      lash_style_tags:           params.lashStyleTags ?? null,
      addon_ids:                 params.addonIds ?? null,
      nail_scope:                params.nailScope ?? null,
      treatment_tier:            params.treatmentTier ?? null,
      fill_in_days:              params.fillInDays ?? null,
      is_returning_customer:     params.isReturningCustomer ?? null,
      price_min:                 params.priceMin,
      price_max:                 params.priceMax,
      status:                    'confirmed' satisfies BookingStatus,
      session_ends_at:           sessionEndsAt,
      no_show_window_minutes:    params.noShowWindowMinutes,
      nail_package_id:           params.nailPackageId ?? null,
      preference:                params.preference ?? null,
      customer_note:             params.customerNote ?? null,
      briefing_ref_photo_url:    params.briefingRefPhotoUrl ?? null,
      early_completion:          false,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  // Lock the slot
  await supabase
    .from('slots')
    .update({ is_booked: true })
    .eq('id', params.slotId)

  // Attach starts_at from the slot (not a booking column)
  return { data: { ...data, starts_at: params.startsAt } as Booking, error: null }
}

// ── Cancel ───────────────────────────────────────────────────

// Cancels a booking. Determines status + flag type by actor + timing.
// Call createCancellationFlag() from lib/flags.ts after this.
// Caller (API route / server action) must verify auth before calling.
export async function cancelBooking(
  bookingId: string,
  actor: CancellationActor
): Promise<Result<{ status: BookingStatus; isSameDay: boolean; minutesUntil: number }>> {
  const admin = createAdminClient()

  const { data: booking } = await admin
    .from('bookings')
    .select('slot_id, created_at, status')
    .eq('id', bookingId)
    .single()

  if (!booking) return { data: null, error: 'Booking not found' }

  // starts_at lives on the slot, not the booking
  const { data: slot } = await admin
    .from('slots')
    .select('starts_at')
    .eq('id', booking.slot_id)
    .single()

  if (!slot) return { data: null, error: 'Slot not found' }

  const now        = Date.now()
  const createdMs  = new Date(booking.created_at).getTime()
  const startsMs   = new Date(slot.starts_at).getTime()
  const minutesUntil = (startsMs - now) / 60000
  const isSameDay  = new Date(slot.starts_at).toDateString() === new Date().toDateString()
  const withinGrace = actor === 'customer' && (now - createdMs) < GRACE_PERIOD_MS

  const status: BookingStatus =
    actor === 'pro'   ? 'cancelled_pro' :
    withinGrace       ? 'cancelled_grace' :
                        'cancelled_customer'

  const { error: updateError } = await admin
    .from('bookings')
    .update({ status, cancelled_at: new Date().toISOString(), cancellation_actor: actor })
    .eq('id', bookingId)

  if (updateError) return { data: null, error: updateError.message }

  // Free the slot
  await admin.from('slots').update({ is_booked: false }).eq('id', booking.slot_id)

  return { data: { status, isSameDay, minutesUntil }, error: null }
}

// ── Complete ─────────────────────────────────────────────────

// Marks a booking complete. Call from:
// (a) Scheduled job when session_ends_at passes (early = false)
// (b) Pro taps 結束服務 button (early = true)
export async function completeBooking(
  bookingId: string,
  early: boolean
): Promise<Result<null>> {
  const admin = createAdminClient()

  const { error } = await admin
    .from('bookings')
    .update({
      status:           'completed' satisfies BookingStatus,
      completed_at:     new Date().toISOString(),
      early_completion: early,
    })
    .eq('id', bookingId)

  return { data: null, error: error?.message ?? null }
}

// ── No-show ──────────────────────────────────────────────────

// Marks a no-show. Activates only after starts_at + no_show_window_minutes.
// Check window before calling — enforced in the UI, but double-check here.
// Caller must verify auth before calling.
export async function markNoShow(
  bookingId: string,
  reporter: 'customer' | 'pro'
): Promise<Result<null>> {
  const admin = createAdminClient()

  const { data: booking } = await admin
    .from('bookings')
    .select('slot_id, no_show_window_minutes')
    .eq('id', bookingId)
    .single()

  if (!booking) return { data: null, error: 'Booking not found' }

  const { data: slot } = await admin
    .from('slots')
    .select('starts_at')
    .eq('id', booking.slot_id)
    .single()

  if (!slot) return { data: null, error: 'Slot not found' }

  const windowMs = booking.no_show_window_minutes * 60 * 1000
  const activatesAt = new Date(slot.starts_at).getTime() + windowMs

  if (Date.now() < activatesAt) {
    return { data: null, error: 'No-show window has not opened yet' }
  }

  const status: BookingStatus = reporter === 'pro' ? 'no_show_customer' : 'no_show_pro'

  const { error } = await admin
    .from('bookings')
    .update({ status, no_show_reported_at: new Date().toISOString(), no_show_reporter: reporter })
    .eq('id', bookingId)

  return { data: null, error: error?.message ?? null }
}

// ── Reschedule ───────────────────────────────────────────────

// Customer requests a reschedule. Only allowed if session > 2hr away.
// Caller must verify auth before calling.
export async function requestReschedule(bookingId: string): Promise<Result<null>> {
  const admin = createAdminClient()

  const { data: booking } = await admin
    .from('bookings')
    .select('slot_id, status')
    .eq('id', bookingId)
    .single()

  if (!booking) return { data: null, error: 'Booking not found' }

  const { data: slot } = await admin
    .from('slots')
    .select('starts_at')
    .eq('id', booking.slot_id)
    .single()

  if (!slot) return { data: null, error: 'Slot not found' }

  const minsUntil = (new Date(slot.starts_at).getTime() - Date.now()) / 60000
  if (minsUntil < 120) return { data: null, error: 'Reschedule not allowed within 2 hours of session' }

  const { error } = await admin
    .from('bookings')
    .update({ status: 'reschedule_pending' satisfies BookingStatus })
    .eq('id', bookingId)

  return { data: null, error: error?.message ?? null }
}

// Pro approves or declines reschedule.
// If approved: old slot freed, new slot locked, status → rescheduled.
// If declined: status → confirmed (original booking restored).
// Caller must verify auth before calling.
export async function resolveReschedule(
  bookingId: string,
  approved: boolean,
  newSlotId?: string
): Promise<Result<null>> {
  const admin = createAdminClient()

  if (!approved) {
    await admin
      .from('bookings')
      .update({ status: 'confirmed' satisfies BookingStatus })
      .eq('id', bookingId)
    return { data: null, error: null }
  }

  if (!newSlotId) return { data: null, error: 'newSlotId required when approved = true' }

  const { data: booking } = await admin
    .from('bookings')
    .select('slot_id')
    .eq('id', bookingId)
    .single()

  if (!booking) return { data: null, error: 'Booking not found' }

  // Free old slot, lock new slot
  await admin.from('slots').update({ is_booked: false }).eq('id', booking.slot_id)
  await admin.from('slots').update({ is_booked: true }).eq('id', newSlotId)

  await admin
    .from('bookings')
    .update({ status: 'rescheduled' satisfies BookingStatus, slot_id: newSlotId })
    .eq('id', bookingId)

  return { data: null, error: null }
}

// ── Reminder ─────────────────────────────────────────────────

// Mark reminder as sent (called by cron job at -10 min).
export async function markReminderSent(bookingId: string): Promise<Result<null>> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('bookings')
    .update({ reminder_sent_at: new Date().toISOString() })
    .eq('id', bookingId)
  return { data: null, error: error?.message ?? null }
}

// ── Read ─────────────────────────────────────────────────────

export async function getBooking(bookingId: string, sb?: SupabaseClient): Promise<Result<Booking>> {
  const supabase = sb ?? await createClient()
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single()
  if (error || !data) return { data: null, error: error?.message ?? 'Not found' }
  const [enriched] = await enrichWithStartsAt(supabase, [data])
  return { data: enriched, error: null }
}

export async function getCustomerBookings(userId: string, sb?: SupabaseClient): Promise<Booking[]> {
  const supabase = sb ?? await createClient()
  const { data } = await supabase
    .from('bookings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return enrichWithStartsAt(supabase, data ?? [])
}

export async function getProBookings(proId: string, sb?: SupabaseClient): Promise<Booking[]> {
  const supabase = sb ?? await createClient()
  const { data } = await supabase
    .from('bookings')
    .select('*')
    .eq('pro_id', proId)
    .order('created_at', { ascending: true })
  return enrichWithStartsAt(supabase, data ?? [])
}

// Bookings that need a -10min reminder (starts in 8–12 min, reminder not yet sent)
// Pass admin client from cron routes (no user session available).
export async function getBookingsNeedingReminder(sb?: SupabaseClient): Promise<Booking[]> {
  const supabase = sb ?? await createClient()
  const now      = new Date()
  const from     = new Date(now.getTime() + (REMINDER_MINS - 2) * 60 * 1000).toISOString()
  const to       = new Date(now.getTime() + (REMINDER_MINS + 2) * 60 * 1000).toISOString()

  // starts_at lives on slots, so find booked slots in the window first
  const { data: slots } = await supabase
    .from('slots')
    .select('id')
    .eq('is_booked', true)
    .gte('starts_at', from)
    .lte('starts_at', to)

  if (!slots?.length) return []

  const { data } = await supabase
    .from('bookings')
    .select('*')
    .eq('status', 'confirmed')
    .is('reminder_sent_at', null)
    .in('slot_id', slots.map(s => s.id))

  return enrichWithStartsAt(supabase, data ?? [])
}

// Bookings where session_ends_at has passed but status is still confirmed
// Pass admin client from cron routes (no user session available).
export async function getBookingsReadyToComplete(sb?: SupabaseClient): Promise<Booking[]> {
  const supabase = sb ?? await createClient()
  const { data } = await supabase
    .from('bookings')
    .select('*')
    .eq('status', 'confirmed')
    .lte('session_ends_at', new Date().toISOString())
  return enrichWithStartsAt(supabase, data ?? [])
}

// Bookings stuck in reschedule_pending past 6hr
// Pass admin client from cron routes (no user session available).
export async function getExpiredReschedulePending(sb?: SupabaseClient): Promise<Booking[]> {
  const supabase = sb ?? await createClient()
  const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('bookings')
    .select('*')
    .eq('status', 'reschedule_pending')
    .lte('created_at', cutoff)
  return enrichWithStartsAt(supabase, data ?? [])
}
