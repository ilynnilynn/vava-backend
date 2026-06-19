// ============================================================
// GET /api/cron/reminders-1hr
//
// Sends 1-hour push + in-app reminders to customers with upcoming bookings.
// Runs every 5 minutes via Vercel Cron.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBookingsNeedingReminder, markReminderSent } from '@/lib/bookings'
import { notify } from '@/lib/notifications'

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const bookings = await getBookingsNeedingReminder(supabase, 60, 'reminder_1hr_sent_at')
    let sent = 0

    for (const booking of bookings) {
      try {
        const [{ data: customer }, { data: pro }, { data: categories }] = await Promise.all([
          supabase.from('users').select('push_token_expo').eq('id', booking.user_id).single(),
          supabase.from('pros').select('display_name').eq('id', booking.pro_id).single(),
          supabase.from('service_categories').select('name_zh').in('id', booking.service_category_ids),
        ])

        if (!pro) continue

        const dt = new Date(booking.starts_at)
        const dateTime = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`
        const serviceSummary = categories?.map(c => c.name_zh).join(' · ') ?? '服務'

        try {
          await notify({
            userId: booking.user_id,
            pushToken: customer?.push_token_expo,
            type: 'booking_reminder_1hr',
            title: '預約提醒 ⏰',
            body: `您的預約將在 1 小時後開始（${pro.display_name}）\n💅 ${serviceSummary}`,
            bookingId: booking.id,
            data: { dateTime },
          })
          await supabase.from('notification_logs').insert({
            user_id: booking.user_id, channel: 'in_app', type: 'booking_reminder_1hr',
            booking_id: booking.id, success: true, error_message: null,
          })
        } catch (notifyErr) {
          console.error(`[cron/reminders-1hr] notify failed for booking ${booking.id}:`, notifyErr)
          await supabase.from('notification_logs').insert({
            user_id: booking.user_id, channel: 'in_app', type: 'booking_reminder_1hr',
            booking_id: booking.id, success: false, error_message: String(notifyErr),
          })
        }

        await markReminderSent(booking.id, 'reminder_1hr_sent_at')
        sent++
      } catch (err) {
        console.error(`[cron/reminders-1hr] failed for booking ${booking.id}:`, err)
      }
    }

    return NextResponse.json({ ok: true, processed: sent })
  } catch (err) {
    console.error('[cron/reminders-1hr] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
