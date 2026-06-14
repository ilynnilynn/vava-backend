import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cancelBooking } from '@/lib/bookings'
import { getCancellationFlag, createFlag } from '@/lib/flags'
import { notifyProCustomerCancelled } from '@/lib/notifications'

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

  // Verify ownership
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
    return NextResponse.json({ error: 'Only confirmed bookings can be cancelled' }, { status: 400 })
  }

  // Get starts_at from the slot
  const { data: slot } = await supabase
    .from('slots')
    .select('starts_at')
    .eq('id', booking.slot_id)
    .single()

  if (!slot) {
    return NextResponse.json({ error: 'Slot not found' }, { status: 500 })
  }

  // Cancel (uses admin client internally — auth already verified above)
  const result = await cancelBooking(bookingId, 'customer')
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  // Determine and create flag if needed
  const flagInfo = getCancellationFlag({
    actor: 'customer',
    bookingStatus: result.data!.status,
    startsAt: slot.starts_at,
  })

  if (flagInfo) {
    await createFlag({
      bookingId,
      flaggedEntity: 'user',
      flaggedId: user.id,
      flagType: flagInfo.flagType,
      isSameDay: flagInfo.isSameDay,
    })
  }

  // Notify pro via LINE (best-effort)
  try {
    const { data: pro } = await supabase
      .from('pros')
      .select('line_user_id')
      .eq('id', booking.pro_id)
      .single()

    if (pro?.line_user_id) {
      await notifyProCustomerCancelled({
        proLineUserId: pro.line_user_id,
        withinGrace: result.data!.status === 'cancelled_grace',
      })
    }
  } catch (err) {
    console.error('[bookings/cancel] notification error:', err)
  }

  return NextResponse.json({
    ok: true,
    status: result.data!.status,
    flagType: flagInfo?.flagType ?? null,
  })
}
