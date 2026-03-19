// ============================================================
// BOOKINGS — all booking operations
//
// Rule: import this file everywhere you need booking logic.
// Never write booking queries directly in components or pages.
// ============================================================

import { createClient } from '@/lib/supabase/server'
import type { Booking, BookingStatus, CancellationActor, Result } from '@/types/database'

// ── Constants ────────────────────────────────────────────────

const GRACE_PERIOD_MS    = 10 * 60 * 1000   // 10 minutes
const HARD_FLAG_MINS     = 30               // < 30 min before = hard flag
const REMINDER_MINS      = 10              // reminder fires at -10 min

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
  const supabase = await createClient()

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
      starts_at:                 params.startsAt,
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

  return { data, error: null }
}

// ── Cancel ───────────────────────────────────────────────────

// Cancels a booking. Determines status + flag type by actor + timing.
// Call createCancellationFlag() from lib/flags.ts after this.
export async function cancelBooking(
  bookingId: string,
  actor: CancellationActor
): Promise<Result<{ status: BookingStatus; isSameDay: boolean; minutesUntil: number }>> {
  const supabase = await createClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('slot_id, created_at, starts_at, status')
    .eq('id', bookingId)
    .single()

  if (!booking) return { data: null, error: 'Booking not found' }

  const now        = Date.now()
  const createdMs  = new Date(booking.created_at).getTime()
  const startsMs   = new Date(booking.starts_at).getTime()
  const minutesUntil = (startsMs - now) / 60000
  const isSameDay  = new Date(booking.starts_at).toDateString() === new Date().toDateString()
  const withinGrace = actor === 'customer' && (now - createdMs) < GRACE_PERIOD_MS

  const status: BookingStatus =
    actor === 'pro'   ? 'cancelled_pro' :
    withinGrace       ? 'cancelled_grace' :
                        'cancelled_customer'

  await supabase
    .from('bookings')
    .update({ status, cancelled_at: new Date().toISOString(), cancellation_actor: actor })
    .eq('id', bookingId)

  // Free the slot
  await supabase.from('slots').update({ is_booked: false }).eq('id', booking.slot_id)

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
  const supabase = await createClient()

  const { error } = await supabase
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
export async function markNoShow(
  bookingId: string,
  reporter: 'customer' | 'pro'
): Promise<Result<null>> {
  const supabase = await createClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('starts_at, no_show_window_minutes')
    .eq('id', bookingId)
    .single()

  if (!booking) return { data: null, error: 'Booking not found' }

  const windowMs = booking.no_show_window_minutes * 60 * 1000
  const activatesAt = new Date(booking.starts_at).getTime() + windowMs

  if (Date.now() < activatesAt) {
    return { data: null, error: 'No-show window has not opened yet' }
  }

  const status: BookingStatus = reporter === 'pro' ? 'no_show_customer' : 'no_show_pro'

  const { error } = await supabase
    .from('bookings')
    .update({ status, no_show_reported_at: new Date().toISOString(), no_show_reporter: reporter })
    .eq('id', bookingId)

  return { data: null, error: error?.message ?? null }
}

// ── Reschedule ───────────────────────────────────────────────

// Customer requests a reschedule. Only allowed if session > 2hr away.
export async function requestReschedule(bookingId: string): Promise<Result<null>> {
  const supabase = await createClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('starts_at, status')
    .eq('id', bookingId)
    .single()

  if (!booking) return { data: null, error: 'Booking not found' }

  const minsUntil = (new Date(booking.starts_at).getTime() - Date.now()) / 60000
  if (minsUntil < 120) return { data: null, error: 'Reschedule not allowed within 2 hours of session' }

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'reschedule_pending' satisfies BookingStatus })
    .eq('id', bookingId)

  return { data: null, error: error?.message ?? null }
}

// Pro approves or declines reschedule.
// If approved: old slot freed, new slot locked, status → rescheduled.
// If declined: status → confirmed (original booking restored).
export async function resolveReschedule(
  bookingId: string,
  approved: boolean,
  newSlotId?: string
): Promise<Result<null>> {
  const supabase = await createClient()

  if (!approved) {
    await supabase
      .from('bookings')
      .update({ status: 'confirmed' satisfies BookingStatus })
      .eq('id', bookingId)
    return { data: null, error: null }
  }

  if (!newSlotId) return { data: null, error: 'newSlotId required when approved = true' }

  const { data: booking } = await supabase
    .from('bookings')
    .select('slot_id')
    .eq('id', bookingId)
    .single()

  if (!booking) return { data: null, error: 'Booking not found' }

  // Free old slot, lock new slot
  await supabase.from('slots').update({ is_booked: false }).eq('id', booking.slot_id)
  await supabase.from('slots').update({ is_booked: true }).eq('id', newSlotId)

  await supabase
    .from('bookings')
    .update({ status: 'rescheduled' satisfies BookingStatus, slot_id: newSlotId })
    .eq('id', bookingId)

  return { data: null, error: null }
}

// ── Reminder ─────────────────────────────────────────────────

// Mark reminder as sent (called by cron job at -10 min).
export async function markReminderSent(bookingId: string): Promise<Result<null>> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('bookings')
    .update({ reminder_sent_at: new Date().toISOString() })
    .eq('id', bookingId)
  return { data: null, error: error?.message ?? null }
}

// ── Read ─────────────────────────────────────────────────────

export async function getBooking(bookingId: string): Promise<Result<Booking>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single()
  return { data, error: error?.message ?? null }
}

export async function getCustomerBookings(userId: string): Promise<Booking[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('bookings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getProBookings(proId: string): Promise<Booking[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('bookings')
    .select('*')
    .eq('pro_id', proId)
    .order('starts_at', { ascending: true })
  return data ?? []
}

// Bookings that need a -10min reminder (starts in 8–12 min, reminder not yet sent)
export async function getBookingsNeedingReminder(): Promise<Booking[]> {
  const supabase = await createClient()
  const now      = new Date()
  const from     = new Date(now.getTime() + (REMINDER_MINS - 2) * 60 * 1000).toISOString()
  const to       = new Date(now.getTime() + (REMINDER_MINS + 2) * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('bookings')
    .select('*')
    .eq('status', 'confirmed')
    .is('reminder_sent_at', null)
    .gte('starts_at', from)
    .lte('starts_at', to)

  return data ?? []
}

// Bookings where session_ends_at has passed but status is still confirmed
export async function getBookingsReadyToComplete(): Promise<Booking[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('bookings')
    .select('*')
    .eq('status', 'confirmed')
    .lte('session_ends_at', new Date().toISOString())
  return data ?? []
}

// Bookings stuck in reschedule_pending past 6hr
export async function getExpiredReschedulePending(): Promise<Booking[]> {
  const supabase = await createClient()
  const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('bookings')
    .select('*')
    .eq('status', 'reschedule_pending')
    .lte('updated_at', cutoff)
  return data ?? []
}
