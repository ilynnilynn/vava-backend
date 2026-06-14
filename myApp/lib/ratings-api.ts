// lib/ratings-api.ts — mobile rating helpers (submit + read)
import { supabase } from './supabase'

export type RatingResult = {
  id: string
  booking_id: string
  stars: number
  comment: string | null
  created_at: string
}

export type ProRatingSummary = {
  average: number | null
  count: number
  reviews: {
    id: string
    stars: number
    comment: string | null
    created_at: string
    rater_name: string | null
  }[]
}

/** Submit a customer → pro rating for a completed booking. */
export async function submitMobileRating(params: {
  bookingId: string
  proId: string
  stars: 1 | 2 | 3 | 4 | 5
  comment?: string | null
}): Promise<RatingResult> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('ratings')
    .insert({
      booking_id: params.bookingId,
      rater_type: 'customer',
      rater_id: session.user.id,
      ratee_id: params.proId,
      stars: params.stars,
      comment: params.comment?.trim()?.slice(0, 500) || null,
      is_public: true,
    })
    .select('id, booking_id, stars, comment, created_at')
    .single()

  if (error) {
    if (error.code === '23505') throw new Error('已經評過分了')
    throw new Error(error.message)
  }

  return data
}

/** Check if the current user already rated a booking. */
export async function getExistingRating(bookingId: string): Promise<RatingResult | null> {
  const { data } = await supabase
    .from('ratings')
    .select('id, booking_id, stars, comment, created_at')
    .eq('booking_id', bookingId)
    .eq('rater_type', 'customer')
    .single()

  return data ?? null
}

/** Get aggregate rating + recent reviews for a pro. */
export async function getProRatings(proId: string): Promise<ProRatingSummary> {
  const { data: ratings } = await supabase
    .from('ratings')
    .select('id, stars, comment, created_at, rater_id')
    .eq('ratee_id', proId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(20)

  if (!ratings || ratings.length === 0) {
    return { average: null, count: 0, reviews: [] }
  }

  const sum = ratings.reduce((acc, r) => acc + r.stars, 0)
  const average = Math.round((sum / ratings.length) * 10) / 10

  // Batch-fetch rater display names
  const raterIds = [...new Set(ratings.map(r => r.rater_id))]
  const { data: users } = await supabase
    .from('users')
    .select('id, display_name')
    .in('id', raterIds)

  const nameMap = new Map((users ?? []).map(u => [u.id, u.display_name]))

  return {
    average,
    count: ratings.length,
    reviews: ratings.map(r => ({
      id: r.id,
      stars: r.stars,
      comment: r.comment,
      created_at: r.created_at,
      rater_name: nameMap.get(r.rater_id) ?? null,
    })),
  }
}

/** Flag a review as inappropriate. */
export async function flagRating(ratingId: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from('ratings')
    .update({ flagged: true, flagged_reason: reason.trim().slice(0, 500) })
    .eq('id', ratingId)

  if (error) throw new Error(error.message)
}
