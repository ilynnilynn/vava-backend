import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ────────────────────────────────────────────────────

const mockVerifyRatingToken = vi.fn()
const mockGetBooking = vi.fn()
const mockGetRatingForBooking = vi.fn()
const mockSubmitRating = vi.fn()

vi.mock('@/lib/auth', () => ({
  verifyRatingToken: (...args: unknown[]) => mockVerifyRatingToken(...args),
}))

vi.mock('@/lib/bookings', () => ({
  getBooking: (...args: unknown[]) => mockGetBooking(...args),
}))

vi.mock('@/lib/ratings', () => ({
  getRatingForBooking: (...args: unknown[]) => mockGetRatingForBooking(...args),
  submitRating: (...args: unknown[]) => mockSubmitRating(...args),
}))

// ── Helpers ──────────────────────────────────────────────────

function makeRequest(body: unknown, token?: string) {
  const url = token
    ? `http://localhost/api/ratings/submit?token=${encodeURIComponent(token)}`
    : 'http://localhost/api/ratings/submit'
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const VALID_TOKEN = 'valid-token'
const BOOKING_ID = 'booking-1'
const USER_ID = 'user-1'
const PRO_ID = 'pro-1'

const COMPLETED_BOOKING = {
  id: BOOKING_ID,
  user_id: USER_ID,
  pro_id: PRO_ID,
  status: 'completed',
}

// ── Tests ────────────────────────────────────────────────────

describe('POST /api/ratings/submit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVerifyRatingToken.mockReturnValue({ bookingId: BOOKING_ID, userId: USER_ID })
    mockGetBooking.mockResolvedValue({ data: COMPLETED_BOOKING, error: null })
    mockGetRatingForBooking.mockResolvedValue(null)
    mockSubmitRating.mockResolvedValue({
      data: { id: 'rating-1', stars: 5, comment: null },
      error: null,
    })
  })

  // ── Auth ─────────────────────────────────────────────────

  it('returns 400 when token is missing', async () => {
    const { POST } = await import('../../ratings/submit/route')
    const res = await POST(makeRequest({ stars: 5 }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Missing token')
  })

  it('returns 401 when token is invalid', async () => {
    mockVerifyRatingToken.mockImplementation(() => {
      throw new Error('Rating token signature invalid')
    })

    const { POST } = await import('../../ratings/submit/route')
    const res = await POST(makeRequest({ stars: 5 }, 'bad-token'))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Rating token signature invalid')
  })

  it('returns 401 when token is expired', async () => {
    mockVerifyRatingToken.mockImplementation(() => {
      throw new Error('Rating token expired')
    })

    const { POST } = await import('../../ratings/submit/route')
    const res = await POST(makeRequest({ stars: 5 }, 'expired-token'))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Rating token expired')
  })

  it('returns 403 when token userId does not match booking', async () => {
    mockGetBooking.mockResolvedValue({
      data: { ...COMPLETED_BOOKING, user_id: 'other-user' },
      error: null,
    })

    const { POST } = await import('../../ratings/submit/route')
    const res = await POST(makeRequest({ stars: 5 }, VALID_TOKEN))
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('Token does not match booking')
  })

  // ── Validation ───────────────────────────────────────────

  it('returns 400 when stars is missing', async () => {
    const { POST } = await import('../../ratings/submit/route')
    const res = await POST(makeRequest({}, VALID_TOKEN))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('stars must be 1–5')
  })

  it('returns 400 when stars is out of range (0)', async () => {
    const { POST } = await import('../../ratings/submit/route')
    const res = await POST(makeRequest({ stars: 0 }, VALID_TOKEN))
    expect(res.status).toBe(400)
  })

  it('returns 400 when stars is out of range (6)', async () => {
    const { POST } = await import('../../ratings/submit/route')
    const res = await POST(makeRequest({ stars: 6 }, VALID_TOKEN))
    expect(res.status).toBe(400)
  })

  it('returns 400 when stars is not an integer', async () => {
    const { POST } = await import('../../ratings/submit/route')
    const res = await POST(makeRequest({ stars: 3.5 }, VALID_TOKEN))
    expect(res.status).toBe(400)
  })

  it('returns 400 when booking is not completed', async () => {
    mockGetBooking.mockResolvedValue({
      data: { ...COMPLETED_BOOKING, status: 'confirmed' },
      error: null,
    })

    const { POST } = await import('../../ratings/submit/route')
    const res = await POST(makeRequest({ stars: 5 }, VALID_TOKEN))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Booking is not completed')
  })

  it('returns 400 when body is invalid JSON', async () => {
    const { POST } = await import('../../ratings/submit/route')
    const req = new NextRequest(
      `http://localhost/api/ratings/submit?token=${VALID_TOKEN}`,
      { method: 'POST', body: 'not-json' }
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  // ── Happy path ───────────────────────────────────────────

  it('submits rating successfully with stars only', async () => {
    const { POST } = await import('../../ratings/submit/route')
    const res = await POST(makeRequest({ stars: 4 }, VALID_TOKEN))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)

    expect(mockSubmitRating).toHaveBeenCalledWith({
      bookingId: BOOKING_ID,
      raterType: 'customer',
      raterId: USER_ID,
      rateeId: PRO_ID,
      stars: 4,
      comment: null,
    })
  })

  it('submits rating with comment', async () => {
    const { POST } = await import('../../ratings/submit/route')
    const res = await POST(makeRequest({ stars: 5, comment: '很棒的服務！' }, VALID_TOKEN))
    expect(res.status).toBe(200)

    expect(mockSubmitRating).toHaveBeenCalledWith(
      expect.objectContaining({
        stars: 5,
        comment: '很棒的服務！',
      })
    )
  })

  it('truncates comment to 500 chars', async () => {
    const longComment = 'A'.repeat(600)
    const { POST } = await import('../../ratings/submit/route')
    const res = await POST(makeRequest({ stars: 3, comment: longComment }, VALID_TOKEN))
    expect(res.status).toBe(200)

    expect(mockSubmitRating).toHaveBeenCalledWith(
      expect.objectContaining({
        comment: 'A'.repeat(500),
      })
    )
  })

  // ── Duplicate ────────────────────────────────────────────

  it('returns 409 when rating already exists', async () => {
    mockGetRatingForBooking.mockResolvedValue({
      id: 'existing',
      stars: 5,
      rater_type: 'customer',
    })

    const { POST } = await import('../../ratings/submit/route')
    const res = await POST(makeRequest({ stars: 4 }, VALID_TOKEN))
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toBe('Rating already submitted')

    // submitRating should NOT have been called
    expect(mockSubmitRating).not.toHaveBeenCalled()
  })

  // ── Booking not found ────────────────────────────────────

  it('returns 404 when booking does not exist', async () => {
    mockGetBooking.mockResolvedValue({ data: null, error: 'Not found' })

    const { POST } = await import('../../ratings/submit/route')
    const res = await POST(makeRequest({ stars: 5 }, VALID_TOKEN))
    expect(res.status).toBe(404)
  })

  // ── submitRating error ───────────────────────────────────

  it('returns 500 when submitRating returns error', async () => {
    mockSubmitRating.mockResolvedValue({ data: null, error: 'DB error' })

    const { POST } = await import('../../ratings/submit/route')
    const res = await POST(makeRequest({ stars: 5 }, VALID_TOKEN))
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('DB error')
  })
})
