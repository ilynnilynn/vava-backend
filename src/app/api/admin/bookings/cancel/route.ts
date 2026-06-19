// ============================================================
// POST /api/admin/bookings/cancel
//
// Admin-only: cancels any active booking.
// Marks it as cancelled_pro (admin intervention) and releases the slot.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const { data: userRow } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!userRow?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── Parse body ───────────────────────────────────────────
  let body: { bookingId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { bookingId } = body
  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId is required' }, { status: 400 })
  }

  // ── Cancel booking ──────────────────────────────────────
  const admin = createAdminClient()

  // Fetch booking first to validate it can be cancelled
  const { data: booking, error: fetchError } = await admin
    .from('bookings')
    .select('id, status, slot_id')
    .eq('id', bookingId)
    .single()

  if (fetchError || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  const cancellableStatuses = ['confirmed', 'reschedule_pending']
  if (!cancellableStatuses.includes(booking.status)) {
    return NextResponse.json(
      { error: `Booking is ${booking.status} and cannot be cancelled` },
      { status: 409 }
    )
  }

  // Cancel the booking and release the slot
  const [{ error: cancelError }, { error: slotError }] = await Promise.all([
    admin
      .from('bookings')
      .update({
        status: 'cancelled_pro',
        cancelled_at: new Date().toISOString(),
        cancellation_actor: 'pro', // admin intervention treated as pro-side
      })
      .eq('id', bookingId),
    admin
      .from('slots')
      .update({ is_booked: false })
      .eq('id', booking.slot_id),
  ])

  if (cancelError) {
    console.error('[admin/bookings/cancel] cancel error:', cancelError)
    return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 })
  }
  if (slotError) {
    console.error('[admin/bookings/cancel] slot release error:', slotError)
  }

  return NextResponse.json({ ok: true })
}
