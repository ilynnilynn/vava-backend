import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ────────────────────────────────────────────────────

const mockExpireStaleSlots = vi.fn(async () => {})

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ __admin: true })),
}))

vi.mock('@/lib/slots', () => ({
  expireStaleSlots: (...args: unknown[]) => mockExpireStaleSlots(...args),
}))

// ── Helpers ──────────────────────────────────────────────────

const CRON_SECRET = 'test-cron-secret'

function makeRequest(authorization?: string) {
  const headers: Record<string, string> = {}
  if (authorization) headers['authorization'] = authorization
  return new NextRequest('http://localhost/api/cron/expire-slots', { headers })
}

// ── Tests ────────────────────────────────────────────────────

describe('GET /api/cron/expire-slots', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('CRON_SECRET', CRON_SECRET)
  })

  it('returns 401 without authorization header', async () => {
    const { GET } = await import('../../cron/expire-slots/route')
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 401 with wrong secret', async () => {
    const { GET } = await import('../../cron/expire-slots/route')
    const res = await GET(makeRequest('Bearer wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('calls expireStaleSlots with admin client and returns ok', async () => {
    const { GET } = await import('../../cron/expire-slots/route')
    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(mockExpireStaleSlots).toHaveBeenCalledOnce()
    expect(mockExpireStaleSlots).toHaveBeenCalledWith(expect.objectContaining({ __admin: true }))
  })

  it('returns 500 when expireStaleSlots throws', async () => {
    mockExpireStaleSlots.mockRejectedValueOnce(new Error('DB down'))

    const { GET } = await import('../../cron/expire-slots/route')
    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(500)
  })
})
