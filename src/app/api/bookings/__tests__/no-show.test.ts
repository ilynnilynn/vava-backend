import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ── Mock Supabase ─────────────────────────────────────────────

let mockUser: { id: string } | null = null
let mockBooking: Record<string, unknown> | null = null
let mockMarkNoShowResult: { data: null; error: string | null } = { data: null, error: null }

const mockSingle = vi.fn()
const mockEq = vi.fn(() => ({ single: mockSingle, eq: mockEq }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))
const mockRequireAuth = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

vi.mock('@/lib/bookings', () => ({
  markNoShow: vi.fn(async () => mockMarkNoShowResult),
}))

const mockCreateFlag = vi.fn(async () => ({ data: null, error: null }))
vi.mock('@/lib/flags', () => ({
  createFlag: mockCreateFlag,
}))

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/bookings/no-show', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/bookings/no-show', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = { id: 'user-1' }
    mockBooking = { user_id: 'user-1', pro_id: 'pro-1', starts_at: new Date().toISOString(), status: 'confirmed' }
    mockMarkNoShowResult = { data: null, error: null }
    mockRequireAuth.mockResolvedValue({ supabase: { from: mockFrom }, user: mockUser })
    mockSingle.mockResolvedValue({ data: mockBooking })
    mockCreateFlag.mockResolvedValue({ data: null, error: null })
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockResolvedValue({ error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) })

    const { POST } = await import('../no-show/route')
    const res = await POST(makeRequest({ bookingId: 'b-1' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when bookingId missing', async () => {
    const { POST } = await import('../no-show/route')
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('returns 404 when booking not found', async () => {
    mockSingle.mockResolvedValue({ data: null })

    const { POST } = await import('../no-show/route')
    const res = await POST(makeRequest({ bookingId: 'b-1' }))
    expect(res.status).toBe(404)
  })

  it('returns 403 when user does not own booking', async () => {
    mockBooking = { user_id: 'other-user', pro_id: 'pro-1', starts_at: new Date().toISOString(), status: 'confirmed' }
    mockSingle.mockResolvedValue({ data: mockBooking })

    const { POST } = await import('../no-show/route')
    const res = await POST(makeRequest({ bookingId: 'b-1' }))
    expect(res.status).toBe(403)
  })

  it('returns 400 when booking is not confirmed', async () => {
    mockBooking = { user_id: 'user-1', pro_id: 'pro-1', starts_at: new Date().toISOString(), status: 'completed' }
    mockSingle.mockResolvedValue({ data: mockBooking })

    const { POST } = await import('../no-show/route')
    const res = await POST(makeRequest({ bookingId: 'b-1' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when no-show window not open yet', async () => {
    mockMarkNoShowResult = { data: null, error: 'No-show window has not opened yet' }

    const { POST } = await import('../no-show/route')
    const res = await POST(makeRequest({ bookingId: 'b-1' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('No-show window has not opened yet')
  })

  it('returns ok and creates flag on success', async () => {
    const { POST } = await import('../no-show/route')
    const res = await POST(makeRequest({ bookingId: 'b-1' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(mockCreateFlag).toHaveBeenCalledWith(
      expect.objectContaining({
        flaggedEntity: 'pro',
        flaggedId: 'pro-1',
        flagType: 'no_show',
      })
    )
  })
})
