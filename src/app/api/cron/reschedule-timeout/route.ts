// ============================================================
// GET /api/cron/reschedule-timeout
//
// Reverts bookings stuck in reschedule_pending > 6hr back to confirmed.
// Runs every 10 minutes via Vercel Cron.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireCron } from '@/lib/cron'
import { createAdminClient } from '@/lib/supabase/admin'
import { getExpiredReschedulePending } from '@/lib/bookings'
import { notify } from '@/lib/notifications'
import type { BookingStatus } from '@/types/database'

export async function GET(req: NextRequest) {
  const denied = requireCron(req)
  if (denied) return denied

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
        .select('push_token_expo')
        .eq('id', booking.user_id)
        .single()

      await notify({
        userId: booking.user_id,
        pushToken: customer?.push_token_expo,
        type: 'booking_changed',
        title: '更改時間結果',
        body: '設計師無法接受此次更改時間申請，您的原預約維持不變。',
        bookingId: booking.id,
      })
    }

    return NextResponse.json({ ok: true, processed: bookings.length })
  } catch (err) {
    console.error('[cron/reschedule-timeout] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
