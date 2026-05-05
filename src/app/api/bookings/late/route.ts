import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  // Verify ownership and status
  const { data: booking } = await supabase
    .from('bookings')
    .select('user_id, status')
    .eq('id', bookingId)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }
  if (booking.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (booking.status !== 'confirmed') {
    return NextResponse.json({ error: 'Only confirmed bookings can be updated' }, { status: 400 })
  }

  // Set late notification timestamp
  const { error } = await supabase
    .from('bookings')
    .update({ customer_late_notified_at: new Date().toISOString() })
    .eq('id', bookingId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
