import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requestReschedule } from '@/lib/bookings'
import { notifyProRescheduleRequested } from '@/lib/notifications'

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
  const newSlotId = typeof body.newSlotId === 'string' ? body.newSlotId.trim() : ''
  if (!bookingId || !newSlotId) {
    return NextResponse.json({ error: 'bookingId and newSlotId are required' }, { status: 400 })
  }

  // Verify ownership + status
  const { data: booking } = await supabase
    .from('bookings')
    .select('user_id, pro_id, slot_id, status')
    .eq('id', bookingId)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }
  if (booking.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (booking.status !== 'confirmed') {
    return NextResponse.json({ error: 'Only confirmed bookings can be rescheduled' }, { status: 400 })
  }

  // Verify the new slot exists, belongs to the same pro, and is available
  const { data: newSlot } = await supabase
    .from('slots')
    .select('id, pro_id, starts_at, is_booked, is_expired')
    .eq('id', newSlotId)
    .single()

  if (!newSlot) {
    return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
  }
  if (newSlot.pro_id !== booking.pro_id) {
    return NextResponse.json({ error: 'Slot does not belong to this pro' }, { status: 400 })
  }
  if (newSlot.is_booked || newSlot.is_expired) {
    return NextResponse.json({ error: 'Slot is not available' }, { status: 409 })
  }

  // Request reschedule (checks 2hr window)
  const result = await requestReschedule(bookingId)
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  // Store proposed slot on the booking
  await supabase
    .from('bookings')
    .update({ proposed_slot_id: newSlotId })
    .eq('id', bookingId)

  // Load data for notification
  const [proRes, slotRes, userRes] = await Promise.all([
    supabase.from('pros').select('line_user_id').eq('id', booking.pro_id).single(),
    supabase.from('slots').select('starts_at').eq('id', booking.slot_id).single(),
    supabase.from('users').select('name').eq('id', user.id).single(),
  ])

  if (proRes.data?.line_user_id && slotRes.data && userRes.data) {
    const originalDateTime = new Date(slotRes.data.starts_at).toLocaleString('zh-TW', {
      month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
    const newDateTime = new Date(newSlot.starts_at).toLocaleString('zh-TW', {
      month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })

    await notifyProRescheduleRequested({
      proLineUserId: proRes.data.line_user_id,
      customerName: userRes.data.name,
      originalDateTime,
      newDateTime,
    })
  }

  return NextResponse.json({ ok: true })
}
