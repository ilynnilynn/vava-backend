// ============================================================
// POST /api/bookings/cancel-pro
//
// Pro cancels a booking. Applies hard flag to pro.
// Sends warm-handoff notification to customer.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cancelBooking } from '@/lib/bookings'
import { createFlag } from '@/lib/flags'
import { notifyCustomerProCancelled, sendPushNotification, createInAppNotification } from '@/lib/notifications'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  // Notify customer via LINE + push + in-app (best-effort)
  try {
    const { data: customer } = await supabase
      .from('users')
      .select('line_user_id, push_token_expo')
      .eq('id', booking.user_id)
      .single()

    const searchUrl = `${process.env.NEXT_PUBLIC_APP_URL}/search`

    if (customer?.line_user_id) {
      try {
        await notifyCustomerProCancelled({
          customerLineUserId: customer.line_user_id,
          searchUrl,
        })
      } catch (lineErr) {
        console.error('[bookings/cancel-pro] LINE notification failed:', lineErr)
      }
    }

    if (customer?.push_token_expo) {
      await sendPushNotification({
        pushToken: customer.push_token_expo,
        title: '預約已取消',
        body: '設計師臨時有緊急狀況，VAVA 正在為您尋找其他設計師。',
        data: { type: 'booking_cancelled_pro', bookingId },
      }).catch(err => console.error('[bookings/cancel-pro] push failed:', err))
    }

    await createInAppNotification({
      userId: booking.user_id,
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
