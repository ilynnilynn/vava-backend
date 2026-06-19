import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/server'
import { markNoShow } from '@/lib/bookings'
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

  // Verify ownership
  const { data: booking } = await supabase
    .from('bookings')
    .select('user_id, pro_id, starts_at, status')
    .eq('id', bookingId)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }
  if (booking.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (booking.status !== 'confirmed') {
    return NextResponse.json({ error: 'Only confirmed bookings can report no-show' }, { status: 400 })
  }

  // Mark no-show (validates window internally)
  const result = await markNoShow(bookingId, 'customer')
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  // Flag the pro for no-show
  await createFlag({
    bookingId,
    flaggedEntity: 'pro',
    flaggedId: booking.pro_id,
    flagType: 'no_show',
    isSameDay: true,
  })

  // Notify customer (in-app + push, best-effort)
  try {
    const { data: customer } = await supabase
      .from('users')
      .select('push_token_expo')
      .eq('id', user.id)
      .single()

    await notify({
      userId: user.id,
      pushToken: customer?.push_token_expo,
      type: 'pro_no_show',
      title: '預約出現問題',
      body: '非常抱歉此次預約出現問題。VAVA 正在為您尋找其他可用的設計師。',
      bookingId,
    })
  } catch (err) {
    console.error('[bookings/no-show] notification error:', err)
  }

  return NextResponse.json({ ok: true })
}
