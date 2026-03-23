import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveReschedule } from '@/lib/bookings'
import { notifyCustomerRescheduleOutcome } from '@/lib/notifications'
import { parseUTC } from '@/lib/utils'

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
  const { data: customer } = await supabase
    .from('users')
    .select('line_user_id')
    .eq('id', booking.user_id)
    .single()

  if (customer?.line_user_id) {
    let newDateTime: string | undefined
    if (approved && newSlotId) {
      const { data: slot } = await supabase
        .from('slots')
        .select('starts_at')
        .eq('id', newSlotId)
        .single()
      if (slot) {
        newDateTime = new Date(parseUTC(slot.starts_at)).toLocaleString('zh-TW', {
          month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
        })
      }
    }

    await notifyCustomerRescheduleOutcome({
      customerLineUserId: customer.line_user_id,
      approved,
      newDateTime,
    })
  }

  return NextResponse.json({ ok: true })
}
