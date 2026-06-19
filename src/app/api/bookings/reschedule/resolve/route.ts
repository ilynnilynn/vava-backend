import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/server'
import { resolveReschedule } from '@/lib/bookings'
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
  const approved = typeof body.approved === 'boolean' ? body.approved : null
  if (!bookingId || approved === null) {
    return NextResponse.json({ error: 'bookingId and approved are required' }, { status: 400 })
  }

  // Load booking + verify caller is the pro
  const { data: booking } = await supabase
    .from('bookings')
    .select('pro_id, user_id, status, proposed_slot_id')
    .eq('id', bookingId)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }
  if (booking.pro_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (booking.status !== 'reschedule_pending') {
    return NextResponse.json({ error: 'Booking is not pending reschedule' }, { status: 400 })
  }

  // Resolve
  const newSlotId = approved ? (booking.proposed_slot_id ?? undefined) : undefined
  const result = await resolveReschedule(bookingId, approved, newSlotId)
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  // Clear proposed_slot_id
  await supabase
    .from('bookings')
    .update({ proposed_slot_id: null })
    .eq('id', bookingId)

  // Notify customer
  try {
    const { data: customer } = await supabase
      .from('users')
      .select('push_token_expo')
      .eq('id', booking.user_id)
      .single()

    let bodyText: string
    if (approved) {
      let newDateTime = ''
      if (newSlotId) {
        const { data: slot } = await supabase
          .from('slots')
          .select('starts_at')
          .eq('id', newSlotId)
          .single()
        if (slot) {
          newDateTime = new Date(slot.starts_at).toLocaleString('zh-TW', {
            month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
          })
        }
      }
      bodyText = newDateTime
        ? `設計師已接受更改時間，新時間為 ${newDateTime}。`
        : '設計師已接受更改時間申請。'
    } else {
      bodyText = '設計師無法接受此次更改時間申請，您的原預約維持不變。'
    }

    await notify({
      userId: booking.user_id,
      pushToken: customer?.push_token_expo,
      type: 'booking_changed',
      title: '更改時間結果',
      body: bodyText,
      bookingId,
    })
  } catch (err) {
    console.error('[bookings/reschedule/resolve] notification error:', err)
  }

  return NextResponse.json({ ok: true })
}
