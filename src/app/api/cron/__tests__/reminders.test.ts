import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ────────────────────────────────────────────────────

const mockGetBookingsNeedingReminder = vi.fn(async () => [])
const mockMarkReminderSent = vi.fn(async () => ({ data: null, error: null }))
const mockNotifyCustomerReminder = vi.fn(async () => {})

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
  notifyCustomerReminder: (...args: unknown[]) => mockNotifyCustomerReminder(...args),
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
    expect(mockNotifyCustomerReminder).not.toHaveBeenCalled()
  })

  it('sends reminders and marks them sent', async () => {
    mockGetBookingsNeedingReminder.mockResolvedValueOnce([
      { id: 'b-1', user_id: 'u-1', pro_id: 'p-1', starts_at: '2026-03-23T14:30:00Z' },
    ])
    // First call: users.select → customer
    // Second call: pros.select → pro
    mockSingle
      .mockResolvedValueOnce({ data: { line_user_id: 'line-u-1' } })
      .mockResolvedValueOnce({ data: { display_name: '小美', studio_address: '台北市大安區' } })

    const { GET } = await import('../../cron/reminders/route')
    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.processed).toBe(1)

    expect(mockNotifyCustomerReminder).toHaveBeenCalledOnce()
    expect(mockNotifyCustomerReminder).toHaveBeenCalledWith(expect.objectContaining({
      customerLineUserId: 'line-u-1',
      proDisplayName: '小美',
      studioAddress: '台北市大安區',
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
