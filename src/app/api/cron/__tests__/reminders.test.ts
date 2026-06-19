import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ────────────────────────────────────────────────────

const mockGetBookingsNeedingReminder = vi.fn(async () => [])
const mockMarkReminderSent = vi.fn(async () => ({ data: null, error: null }))
const mockNotify = vi.fn(async () => {})

const mockSingle = vi.fn()
const mockEq = vi.fn(() => ({ single: mockSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    __admin: true,
    from: vi.fn(() => ({ select: mockSelect })),
  })),
}))

vi.mock('@/lib/bookings', () => ({
  getBookingsNeedingReminder: (...args: unknown[]) => mockGetBookingsNeedingReminder(...args),
  markReminderSent: (...args: unknown[]) => mockMarkReminderSent(...args),
}))

vi.mock('@/lib/notifications', () => ({
  notify: (...args: unknown[]) => mockNotify(...args),
}))

// ── Helpers ──────────────────────────────────────────────────

const CRON_SECRET = 'test-cron-secret'

function makeRequest(authorization?: string) {
  const headers: Record<string, string> = {}
  if (authorization) headers['authorization'] = authorization
  return new NextRequest('http://localhost/api/cron/reminders', { headers })
}

// ── Tests ────────────────────────────────────────────────────

describe('GET /api/cron/reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('CRON_SECRET', CRON_SECRET)
  })

  it('returns 401 without valid secret', async () => {
    const { GET } = await import('../../cron/reminders/route')
    const res = await GET(makeRequest('Bearer wrong'))
    expect(res.status).toBe(401)
  })

  it('returns ok with processed: 0 when no bookings need reminders', async () => {
    const { GET } = await import('../../cron/reminders/route')
    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.processed).toBe(0)
    expect(mockNotify).not.toHaveBeenCalled()
  })

  it('sends reminders and marks them sent', async () => {
    mockGetBookingsNeedingReminder.mockResolvedValueOnce([
      { id: 'b-1', user_id: 'u-1', pro_id: 'p-1', starts_at: '2026-03-23T14:30:00Z' },
    ])
    mockSingle
      .mockResolvedValueOnce({ data: { push_token_expo: 'expo-token-1' } })
      .mockResolvedValueOnce({ data: { display_name: '小美', studio_address: '台北市大安區' } })

    const { GET } = await import('../../cron/reminders/route')
    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.processed).toBe(1)

    expect(mockNotify).toHaveBeenCalledOnce()
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'u-1',
      type: 'booking_reminder',
      bookingId: 'b-1',
    }))
    expect(mockMarkReminderSent).toHaveBeenCalledWith('b-1')
  })

  it('returns 500 when getBookingsNeedingReminder throws', async () => {
    mockGetBookingsNeedingReminder.mockRejectedValueOnce(new Error('DB down'))

    const { GET } = await import('../../cron/reminders/route')
    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(500)
  })
})
