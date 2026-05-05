// ============================================================
// GET /api/cron/rating-prompts
//
// Sends rating prompt LINE messages to customers 1hr after completion.
// Runs every 15 minutes via Vercel Cron.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBookingsNeedingRatingPrompt, markRatingPromptSent } from '@/lib/ratings'
import { notifyCustomerRatingPrompt } from '@/lib/notifications'
import { createRatingToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const bookings = await getBookingsNeedingRatingPrompt(supabase)
    let sent = 0

    for (const booking of bookings) {
      try {
        // Fetch customer line_user_id and pro display_name
        const [{ data: customer }, { data: pro }] = await Promise.all([
          supabase.from('users').select('line_user_id').eq('id', booking.user_id).single(),
          supabase.from('pros').select('display_name').eq('id', booking.pro_id).single(),
        ])

        if (customer?.line_user_id && pro) {
          const token = createRatingToken(booking.id, booking.user_id)
          const ratingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/bookings/${booking.id}/rate?token=${token}`

          await notifyCustomerRatingPrompt({
            customerLineUserId: customer.line_user_id,
            proDisplayName: pro.display_name,
            ratingUrl,
          })
        }

        await markRatingPromptSent(booking.id, supabase)
        sent++
      } catch (err) {
        console.error(`[cron/rating-prompts] failed for booking ${booking.id}:`, err)
      }
    }

    return NextResponse.json({ ok: true, processed: sent })
  } catch (err) {
    console.error('[cron/rating-prompts] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
