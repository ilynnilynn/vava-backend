// ============================================================
// GET /api/cron/reminders
//
// Sends -10min LINE reminders to customers with upcoming bookings.
// Runs every 5 minutes via Vercel Cron.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBookingsNeedingReminder, markReminderSent } from '@/lib/bookings'
import { notifyCustomerReminder } from '@/lib/notifications'

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const bookings = await getBookingsNeedingReminder(supabase)
    let sent = 0

    for (const booking of bookings) {
      try {
        // Fetch customer line_user_id and pro details
        const [{ data: customer }, { data: pro }] = await Promise.all([
          supabase.from('users').select('line_user_id').eq('id', booking.user_id).single(),
          supabase.from('pros').select('display_name, studio_address').eq('id', booking.pro_id).single(),
        ])

        if (customer?.line_user_id && pro) {
          const dt = new Date(booking.starts_at)
          const dateTime = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`

          await notifyCustomerReminder({
            customerLineUserId: customer.line_user_id,
            proDisplayName: pro.display_name,
            dateTime,
            studioAddress: pro.studio_address,
          })
        }

        await markReminderSent(booking.id)
        sent++
      } catch (err) {
        console.error(`[cron/reminders] failed for booking ${booking.id}:`, err)
      }
    }

    return NextResponse.json({ ok: true, processed: sent })
  } catch (err) {
    console.error('[cron/reminders] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
