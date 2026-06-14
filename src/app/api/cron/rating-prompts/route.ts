// ============================================================
// GET /api/cron/rating-prompts
//
// Sends rating prompt LINE messages to customers 1hr after completion.
// Runs every 15 minutes via Vercel Cron.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBookingsNeedingRatingPrompt, markRatingPromptSent } from '@/lib/ratings'
import { notifyCustomerRatingPrompt, sendPushNotification, createInAppNotification } from '@/lib/notifications'
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
          supabase.from('users').select('line_user_id, push_token_expo').eq('id', booking.user_id).single(),
          supabase.from('pros').select('display_name').eq('id', booking.pro_id).single(),
        ])

        if (!pro) continue
        if (!customer) continue  // skip if customer row missing — don't mark as sent

        const token = createRatingToken(booking.id, booking.user_id)
        const ratingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/bookings/${booking.id}/rate?token=${token}`

        let delivered = false

        // LINE
        if (customer.line_user_id) {
          try {
            await notifyCustomerRatingPrompt({
              customerLineUserId: customer.line_user_id,
              proDisplayName: pro.display_name,
              ratingUrl,
            })
            delivered = true
          } catch (lineErr) {
            console.error(`[cron/rating-prompts] LINE failed for ${booking.id}:`, lineErr)
          }
        }

        // Push
        if (customer.push_token_expo) {
          try {
            await sendPushNotification({
              pushToken: customer.push_token_expo,
              title: '服務已完成 💅',
              body: `請為 ${pro.display_name} 留下評價`,
              data: { type: 'review_prompt', bookingId: booking.id, ratingUrl },
            })
            delivered = true
          } catch (pushErr) {
            console.error(`[cron/rating-prompts] push failed for ${booking.id}:`, pushErr)
          }
        }

        // In-app (always try)
        try {
          await createInAppNotification({
            userId: booking.user_id,
            type: 'review_prompt',
            title: '請留下評價',
            body: `感謝您使用 VAVA！請為 ${pro.display_name} 留下評價。`,
            bookingId: booking.id,
          })
          delivered = true
        } catch (inAppErr) {
          console.error(`[cron/rating-prompts] in-app failed for ${booking.id}:`, inAppErr)
        }

        // Only mark as sent if at least one channel delivered
        if (delivered) {
          await markRatingPromptSent(booking.id, supabase)
          sent++
        } else {
          console.warn(`[cron/rating-prompts] no channel delivered for booking ${booking.id}, will retry`)
        }
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
