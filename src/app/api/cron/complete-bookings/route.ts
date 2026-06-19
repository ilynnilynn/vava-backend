// ============================================================
// GET /api/cron/complete-bookings
//
// Auto-completes bookings whose session_ends_at has passed.
// Runs every 5 minutes via Vercel Cron.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireCron } from '@/lib/cron'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBookingsReadyToComplete, completeBooking } from '@/lib/bookings'

export async function GET(req: NextRequest) {
  const denied = requireCron(req)
  if (denied) return denied

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
