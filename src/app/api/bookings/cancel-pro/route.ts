// ============================================================
// POST /api/bookings/cancel-pro
//
// Pro cancels a booking. Applies hard flag to pro.
// Sends notification to customer via in-app + push.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/server'
import { cancelBooking } from '@/lib/bookings'
import { createFlag } from '@/lib/flags'
import { notify } from '@/lib/notifications'

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  // Parse body
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const bookingId = typeof body.bookingId === 'string' ? body.bookingId.trim() : ''
  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId is required' }, { status: 400 })
  }

  // Verify this user is the pro for this booking
  const { data: pro } = await supabase
    .from('pros')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!pro) {
    return NextResponse.json({ error: 'Not a pro' }, { status: 403 })
  }

  const { data: booking } = await supabase
    .from('bookings')
    .select('user_id, pro_id, slot_id, status')
    .eq('id', bookingId)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }
  if (booking.pro_id !== pro.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (booking.status !== 'confirmed') {
    return NextResponse.json({ error: 'Only confirmed bookings can be cancelled' }, { status: 400 })
  }

  // Cancel booking as pro
  const result = await cancelBooking(bookingId, 'pro')
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  // Always flag pro for cancellation (hard flag)
  await createFlag({
    bookingId,
    flaggedEntity: 'pro',
    flaggedId: pro.id,
    flagType: 'hard',
    isSameDay: result.data!.isSameDay,
  })

  // Notify customer (in-app + push, best-effort)
  try {
    const { data: customer } = await supabase
      .from('users')
      .select('push_token_expo')
      .eq('id', booking.user_id)
      .single()

    await notify({
      userId: booking.user_id,
      pushToken: customer?.push_token_expo,
      type: 'booking_cancelled_pro',
      title: '預約已取消',
      body: '設計師臨時有緊急狀況，VAVA 正在為您尋找其他可用的設計師。',
      bookingId,
    })
  } catch (err) {
    console.error('[bookings/cancel-pro] notification error:', err)
  }

  return NextResponse.json({ ok: true, status: result.data!.status })
}
