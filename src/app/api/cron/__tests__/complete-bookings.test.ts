import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ────────────────────────────────────────────────────

const mockGetBookingsReadyToComplete = vi.fn(async () => [])
const mockCompleteBooking = vi.fn(async () => ({ data: null, error: null }))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ __admin: true })),
}))

vi.mock('@/lib/bookings', () => ({
  getBookingsReadyToComplete: (...args: unknown[]) => mockGetBookingsReadyToComplete(...args),
  completeBooking: (...args: unknown[]) => mockCompleteBooking(...args),
}))

// ── Helpers ──────────────────────────────────────────────────

const CRON_SECRET = 'test-cron-secret'

function makeRequest(authorization?: string) {
  const headers: Record<string, string> = {}
  if (authorization) headers['authorization'] = authorization
  return new NextRequest('http://localhost/api/cron/complete-bookings', { headers })
}

// ── Tests ────────────────────────────────────────────────────

describe('GET /api/cron/complete-bookings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('CRON_SECRET', CRON_SECRET)
  })

  it('returns 401 without valid secret', async () => {
    const { GET } = await import('../../cron/complete-bookings/route')
    const res = await GET(makeRequest('Bearer bad'))
    expect(res.status).toBe(401)
  })

  it('returns ok with processed: 0 when no bookings need completing', async () => {
    const { GET } = await import('../../cron/complete-bookings/route')
    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.processed).toBe(0)
    expect(mockCompleteBooking).not.toHaveBeenCalled()
  })

  it('completes each booking with admin client and early=false', async () => {
    mockGetBookingsReadyToComplete.mockResolvedValueOnce([
      { id: 'b-1' },
      { id: 'b-2' },
    ])

    const { GET } = await import('../../cron/complete-bookings/route')
    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.processed).toBe(2)

    expect(mockCompleteBooking).toHaveBeenCalledTimes(2)
    expect(mockCompleteBooking).toHaveBeenCalledWith('b-1', false)
    expect(mockCompleteBooking).toHaveBeenCalledWith('b-2', false)
  })

  it('returns 500 when getBookingsReadyToComplete throws', async () => {
    mockGetBookingsReadyToComplete.mockRejectedValueOnce(new Error('DB down'))

    const { GET } = await import('../../cron/complete-bookings/route')
    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(500)
  })
})
