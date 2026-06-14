// ============================================================
// GET /api/cron/reminders-1hr
//
// Sends 1-hour LINE + push reminders to customers with upcoming bookings.
// Runs every 5 minutes via Vercel Cron.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBookingsNeeding1HourReminder, markReminder1HrSent } from '@/lib/bookings'
import { notifyCustomer1HourReminder, sendPushNotification, logNotificationSend } from '@/lib/notifications'

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const bookings = await getBookingsNeeding1HourReminder(supabase)
    let sent = 0

    for (const booking of bookings) {
      try {
        const [{ data: customer }, { data: pro }, { data: categories }] = await Promise.all([
          supabase.from('users').select('line_user_id, push_token_expo').eq('id', booking.user_id).single(),
          supabase.from('pros').select('display_name').eq('id', booking.pro_id).single(),
          supabase.from('service_categories').select('name_zh').in('id', booking.service_category_ids),
        ])

        if (!pro) continue

        const dt = new Date(booking.starts_at)
        const dateTime = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`
        const serviceSummary = categories?.map(c => c.name_zh).join(' · ') ?? '服務'

        // LINE notification
        if (customer?.line_user_id) {
          try {
            await notifyCustomer1HourReminder({
              customerLineUserId: customer.line_user_id,
              proDisplayName: pro.display_name,
              dateTime,
              serviceSummary,
            })
            await logNotificationSend({
              userId: booking.user_id, channel: 'line', type: 'booking_reminder_1hr',
              bookingId: booking.id, success: true,
            })
          } catch (lineErr) {
            console.error(`[cron/reminders-1hr] LINE failed for booking ${booking.id}:`, lineErr)
            await logNotificationSend({
              userId: booking.user_id, channel: 'line', type: 'booking_reminder_1hr',
              bookingId: booking.id, success: false, errorMessage: String(lineErr),
            })
          }
        }

        // Push notification
        if (customer?.push_token_expo) {
          try {
            await sendPushNotification({
              pushToken: customer.push_token_expo,
              title: '預約提醒 ⏰',
              body: `您的預約將在 1 小時後開始（${pro.display_name}）`,
              data: { type: 'booking_reminder_1hr', bookingId: booking.id },
            })
            await logNotificationSend({
              userId: booking.user_id, channel: 'push', type: 'booking_reminder_1hr',
              bookingId: booking.id, success: true,
            })
          } catch (pushErr) {
            console.error(`[cron/reminders-1hr] push failed for booking ${booking.id}:`, pushErr)
          }
        }

        await markReminder1HrSent(booking.id)
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
