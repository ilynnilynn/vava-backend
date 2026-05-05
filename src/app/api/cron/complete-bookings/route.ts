// ============================================================
// GET /api/cron/complete-bookings
//
// Auto-completes bookings whose session_ends_at has passed.
// Runs every 5 minutes via Vercel Cron.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBookingsReadyToComplete, completeBooking } from '@/lib/bookings'

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const bookings = await getBookingsReadyToComplete(supabase)

    for (const booking of bookings) {
      await completeBooking(booking.id, false)
    }

    return NextResponse.json({ ok: true, processed: bookings.length })
  } catch (err) {
    console.error('[cron/complete-bookings] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
