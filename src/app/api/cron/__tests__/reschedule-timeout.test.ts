import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ────────────────────────────────────────────────────

const mockGetExpiredReschedulePending = vi.fn(async () => [])
const mockNotify = vi.fn(async () => {})
const mockUpdate = vi.fn(() => ({ eq: vi.fn() }))
const mockSingle = vi.fn(() => ({ data: { push_token_expo: 'expo-1' } }))
const mockEq = vi.fn((..._args: unknown[]) => ({ single: mockSingle, eq: mockEq }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    __admin: true,
    from: vi.fn(() => ({ update: mockUpdate, select: mockSelect })),
  })),
}))

vi.mock('@/lib/bookings', () => ({
  getExpiredReschedulePending: (...args: unknown[]) => mockGetExpiredReschedulePending(...args),
}))

vi.mock('@/lib/notifications', () => ({
  notify: (...args: unknown[]) => mockNotify(...args),
}))

// ── Helpers ──────────────────────────────────────────────────

const CRON_SECRET = 'test-cron-secret'

function makeRequest(authorization?: string) {
  const headers: Record<string, string> = {}
  if (authorization) headers['authorization'] = authorization
  return new NextRequest('http://localhost/api/cron/reschedule-timeout', { headers })
}

// ── Tests ────────────────────────────────────────────────────

describe('GET /api/cron/reschedule-timeout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('CRON_SECRET', CRON_SECRET)
  })

  it('returns 401 without valid secret', async () => {
    const { GET } = await import('../../cron/reschedule-timeout/route')
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns ok with processed: 0 when no expired reschedules', async () => {
    const { GET } = await import('../../cron/reschedule-timeout/route')
    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.processed).toBe(0)
  })

  it('reverts each expired reschedule to confirmed and notifies customer', async () => {
    mockGetExpiredReschedulePending.mockResolvedValueOnce([
      { id: 'b-1', user_id: 'u-1' },
      { id: 'b-2', user_id: 'u-2' },
    ])

    const { GET } = await import('../../cron/reschedule-timeout/route')
    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.processed).toBe(2)

    expect(mockUpdate).toHaveBeenCalledWith({
      status: 'confirmed',
      proposed_slot_id: null,
    })
    expect(mockNotify).toHaveBeenCalledTimes(2)
  })

  it('returns 500 when getExpiredReschedulePending throws', async () => {
    mockGetExpiredReschedulePending.mockRejectedValueOnce(new Error('DB down'))

    const { GET } = await import('../../cron/reschedule-timeout/route')
    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(500)
  })
})
