import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ────────────────────────────────────────────────────

const mockGetBookingsNeedingRatingPrompt = vi.fn(async () => [])
const mockMarkRatingPromptSent = vi.fn(async () => ({ data: null, error: null }))
const mockNotifyCustomerRatingPrompt = vi.fn(async () => {})

const mockSingle = vi.fn()
const mockEq = vi.fn(() => ({ single: mockSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    __admin: true,
    from: vi.fn(() => ({ select: mockSelect })),
  })),
}))

vi.mock('@/lib/ratings', () => ({
  getBookingsNeedingRatingPrompt: (...args: unknown[]) => mockGetBookingsNeedingRatingPrompt(...args),
  markRatingPromptSent: (...args: unknown[]) => mockMarkRatingPromptSent(...args),
}))

vi.mock('@/lib/notifications', () => ({
  notifyCustomerRatingPrompt: (...args: unknown[]) => mockNotifyCustomerRatingPrompt(...args),
}))

vi.mock('@/lib/auth', () => ({
  createRatingToken: vi.fn((bookingId: string, userId: string) => `mock-token-${bookingId}-${userId}`),
}))

// ── Helpers ──────────────────────────────────────────────────

const CRON_SECRET = 'test-cron-secret'

function makeRequest(authorization?: string) {
  const headers: Record<string, string> = {}
  if (authorization) headers['authorization'] = authorization
  return new NextRequest('http://localhost/api/cron/rating-prompts', { headers })
}

// ── Tests ────────────────────────────────────────────────────

describe('GET /api/cron/rating-prompts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('CRON_SECRET', CRON_SECRET)
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')
  })

  it('returns 401 without valid secret', async () => {
    const { GET } = await import('../../cron/rating-prompts/route')
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns ok with processed: 0 when no bookings need prompts', async () => {
    const { GET } = await import('../../cron/rating-prompts/route')
    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.processed).toBe(0)
    expect(mockNotifyCustomerRatingPrompt).not.toHaveBeenCalled()
  })

  it('sends rating prompts and marks them sent', async () => {
    mockGetBookingsNeedingRatingPrompt.mockResolvedValueOnce([
      { id: 'b-1', user_id: 'u-1', pro_id: 'p-1', completed_at: '2026-03-23T12:00:00Z' },
    ])
    mockSingle
      .mockResolvedValueOnce({ data: { line_user_id: 'line-u-1' } })
      .mockResolvedValueOnce({ data: { display_name: '小美' } })

    const { GET } = await import('../../cron/rating-prompts/route')
    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.processed).toBe(1)

    expect(mockNotifyCustomerRatingPrompt).toHaveBeenCalledOnce()
    expect(mockNotifyCustomerRatingPrompt).toHaveBeenCalledWith(expect.objectContaining({
      customerLineUserId: 'line-u-1',
      proDisplayName: '小美',
      ratingUrl: 'http://localhost:3000/bookings/b-1/rate?token=mock-token-b-1-u-1',
    }))
    expect(mockMarkRatingPromptSent).toHaveBeenCalledWith('b-1', expect.objectContaining({ __admin: true }))
  })

  it('continues processing other bookings if one fails', async () => {
    mockGetBookingsNeedingRatingPrompt.mockResolvedValueOnce([
      { id: 'b-fail', user_id: 'u-1', pro_id: 'p-1', completed_at: '2026-03-23T12:00:00Z' },
      { id: 'b-ok', user_id: 'u-2', pro_id: 'p-2', completed_at: '2026-03-23T12:00:00Z' },
    ])
    // First booking: customer has no line_user_id → skip notify but still mark sent
    // Second booking: succeeds fully
    mockSingle
      .mockResolvedValueOnce({ data: null })                             // b-fail: user not found
      .mockResolvedValueOnce({ data: { display_name: '小美' } })         // b-fail: pro found
      .mockResolvedValueOnce({ data: { line_user_id: 'line-u-2' } })    // b-ok: user found
      .mockResolvedValueOnce({ data: { display_name: '小華' } })         // b-ok: pro found

    const { GET } = await import('../../cron/rating-prompts/route')
    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(200)
    const json = await res.json()
    // Both bookings processed (sent++ happens after markRatingPromptSent)
    // but only b-ok triggered a notification
    expect(json.processed).toBe(2)
    expect(mockNotifyCustomerRatingPrompt).toHaveBeenCalledOnce()
    expect(mockNotifyCustomerRatingPrompt).toHaveBeenCalledWith(expect.objectContaining({
      customerLineUserId: 'line-u-2',
      proDisplayName: '小華',
    }))
  })

  it('returns 500 when getBookingsNeedingRatingPrompt throws', async () => {
    mockGetBookingsNeedingRatingPrompt.mockRejectedValueOnce(new Error('DB down'))

    const { GET } = await import('../../cron/rating-prompts/route')
    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(500)
  })
})
