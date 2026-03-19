// ============================================================
// RATINGS — submit and read ratings
//
// Rule: import this file everywhere you need rating logic.
// Never write ratings queries directly in components or pages.
//
// Two types of ratings:
//   customer → pro:  public, has comment, is_public = true
//   pro → customer:  internal, no comment, is_public = false
//
// Idempotency rule:
//   One rating per (booking_id, rater_type).
//   Enforced by UNIQUE constraint on the table.
//   submitRating() returns a clear error if already submitted.
//
// Rating prompt flow:
//   1. cron/complete-bookings marks bookings complete
//   2. cron/rating-prompts fires 1hr later
//   3. getBookingsNeedingRatingPrompt() finds eligible bookings
//   4. notifyCustomerRatingPrompt() sends LINE message with signed URL
//   5. markRatingPromptSent() prevents re-sending
// ============================================================

import { createClient } from '@/lib/supabase/server'
import type { Rating, RaterType, Result } from '@/types/database'

// ── Write ─────────────────────────────────────────────────────

// Submit a rating. Returns error if already submitted for this booking+rater combo.
// stars: 1–5. comment: optional, customer only.
export async function submitRating(params: {
  bookingId: string
  raterType: RaterType
  raterId: string    // supabase user id of the person rating
  rateeId: string    // supabase user id or pro id being rated
  stars: 1 | 2 | 3 | 4 | 5
  comment?: string | null
}): Promise<Result<Rating>> {
  const supabase = await createClient()

  const isPublic = params.raterType === 'customer'

  // Only customer ratings can have public comments
  const comment = isPublic ? (params.comment ?? null) : null

  const { data, error } = await supabase
    .from('ratings')
    .insert({
      booking_id:  params.bookingId,
      rater_type:  params.raterType,
      rater_id:    params.raterId,
      ratee_id:    params.rateeId,
      stars:       params.stars,
      comment,
      is_public:   isPublic,
    })
    .select()
    .single()

  if (error) {
    // Postgres unique violation code = 23505
    if (error.code === '23505') {
      return { data: null, error: 'Rating already submitted for this booking' }
    }
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

// ── Read ──────────────────────────────────────────────────────

// Average star rating for a pro. Only counts customer ratings (is_public = true).
// Returns null if the pro has no ratings yet.
export async function getProAverageRating(proId: string): Promise<number | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('ratings')
    .select('stars')
    .eq('ratee_id', proId)
    .eq('is_public', true)

  if (!data || data.length === 0) return null

  const sum = data.reduce((acc, r) => acc + r.stars, 0)
  return Math.round((sum / data.length) * 10) / 10  // 1 decimal place
}

// All public ratings for a pro (displayed on pro profile page).
// Ordered newest first.
export async function getProPublicRatings(proId: string): Promise<Rating[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('ratings')
    .select('*')
    .eq('ratee_id', proId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  return data ?? []
}

// Rating for a specific booking by a specific rater.
// Used to check if a user has already rated before showing the form.
export async function getRatingForBooking(
  bookingId: string,
  raterType: RaterType
): Promise<Rating | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('ratings')
    .select('*')
    .eq('booking_id', bookingId)
    .eq('rater_type', raterType)
    .single()

  return data ?? null
}

// ── Cron helpers ──────────────────────────────────────────────

// Mark rating prompt as sent. Called by cron after notifyCustomerRatingPrompt().
// Prevents duplicate LINE messages.
export async function markRatingPromptSent(bookingId: string): Promise<Result<null>> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('bookings')
    .update({ rating_prompt_sent: true })
    .eq('id', bookingId)

  return { data: null, error: error?.message ?? null }
}

// Find bookings that:
//   - Are completed (status = 'completed')
//   - Were completed > 1hr ago (so customer has had time to finish)
//   - Have NOT had a rating prompt sent yet
//
// Called by cron/rating-prompts every 15 min.
export async function getBookingsNeedingRatingPrompt() {
  const supabase = await createClient()

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('bookings')
    .select('id, user_id, pro_id, completed_at')
    .eq('status', 'completed')
    .eq('rating_prompt_sent', false)
    .lte('completed_at', oneHourAgo)
    .not('completed_at', 'is', null)

  return data ?? []
}
