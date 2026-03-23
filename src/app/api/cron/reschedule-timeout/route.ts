// ============================================================
// GET /api/cron/reschedule-timeout
//
// Reverts bookings stuck in reschedule_pending > 6hr back to confirmed.
// Runs every 10 minutes via Vercel Cron.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getExpiredReschedulePending } from '@/lib/bookings'
import { notifyCustomerRescheduleOutcome } from '@/lib/notifications'
import type { BookingStatus } from '@/types/database'

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const bookings = await getExpiredReschedulePending(supabase)

    for (const booking of bookings) {
      await supabase
        .from('bookings')
        .update({
          status: 'confirmed' satisfies BookingStatus,
          proposed_slot_id: null,
        })
        .eq('id', booking.id)

      // Notify customer that reschedule was auto-declined
      const { data: customer } = await supabase
        .from('users')
        .select('line_user_id')
        .eq('id', booking.user_id)
        .single()

      if (customer?.line_user_id) {
        await notifyCustomerRescheduleOutcome({
          customerLineUserId: customer.line_user_id,
          approved: false,
        })
      }
    }

    return NextResponse.json({ ok: true, processed: bookings.length })
  } catch (err) {
    console.error('[cron/reschedule-timeout] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
