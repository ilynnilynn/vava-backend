// ============================================================
// POST /api/ratings/submit
//
// Customer submits a rating via signed token link.
// Token is sent in the rating prompt LINE message.
// No session needed — token proves identity.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { verifyRatingToken } from '@/lib/auth'
import { getBooking } from '@/lib/bookings'
import { submitRating, getRatingForBooking } from '@/lib/ratings'

export async function POST(req: NextRequest) {
  // ── Verify token ─────────────────────────────────────────
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  let bookingId: string
  let userId: string
  try {
    const payload = verifyRatingToken(token)
    bookingId = payload.bookingId
    userId = payload.userId
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid token'
    return NextResponse.json({ error: message }, { status: 401 })
  }

  // ── Parse body ───────────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const stars = Number(body.stars)
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return NextResponse.json({ error: 'stars must be 1–5' }, { status: 400 })
  }

  const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 500) : null

  // ── Look up booking ──────────────────────────────────────
  const bookingResult = await getBooking(bookingId)
  if (bookingResult.error || !bookingResult.data) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  const booking = bookingResult.data

  // Verify the token user matches the booking customer
  if (booking.user_id !== userId) {
    return NextResponse.json({ error: 'Token does not match booking' }, { status: 403 })
  }

  // Only completed bookings can be rated
  if (booking.status !== 'completed') {
    return NextResponse.json({ error: 'Booking is not completed' }, { status: 400 })
  }

  // ── Check duplicate ──────────────────────────────────────
  const existing = await getRatingForBooking(bookingId, 'customer')
  if (existing) {
    return NextResponse.json({ error: 'Rating already submitted' }, { status: 409 })
  }

  // ── Submit rating ────────────────────────────────────────
  const result = await submitRating({
    bookingId,
    raterType: 'customer',
    raterId: userId,
    rateeId: booking.pro_id,
    stars: stars as 1 | 2 | 3 | 4 | 5,
    comment,
  })

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, rating: result.data })
}
