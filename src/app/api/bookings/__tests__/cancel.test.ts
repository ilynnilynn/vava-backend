import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mock Supabase ─────────────────────────────────────────────

let mockUser: { id: string } | null = null
let mockBooking: Record<string, unknown> | null = null
let mockCancelResult: { data: Record<string, unknown> | null; error: string | null } = {
  data: { status: 'cancelled_customer', isSameDay: false, minutesUntil: 180 },
  error: null,
}

const mockSingle = vi.fn()
const mockEq = vi.fn(() => ({ single: mockSingle, eq: mockEq }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))
const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

vi.mock('@/lib/bookings', () => ({
  cancelBooking: vi.fn(async () => mockCancelResult),
}))

const mockCreateFlag = vi.fn(async () => ({ data: null, error: null }))
vi.mock('@/lib/flags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/flags')>()
  return {
    ...actual,
    createFlag: mockCreateFlag,
  }
})

// ── Helpers ───────────────────────────────────────────────────

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/bookings/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ── Tests ─────────────────────────────────────────────────────

describe('POST /api/bookings/cancel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = { id: 'user-1' }
    mockBooking = { user_id: 'user-1', starts_at: new Date(Date.now() + 7200000).toISOString(), status: 'confirmed' }
    mockCancelResult = {
      data: { status: 'cancelled_customer', isSameDay: false, minutesUntil: 120 },
      error: null,
    }
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockSingle.mockResolvedValue({ data: mockBooking })
  })

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no session' } })

    const { POST } = await import('../cancel/route')
    const res = await POST(makeRequest({ bookingId: 'b-1' }))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 400 when bookingId missing', async () => {
    const { POST } = await import('../cancel/route')
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('bookingId is required')
  })

  it('returns 400 when bookingId is empty string', async () => {
    const { POST } = await import('../cancel/route')
    const res = await POST(makeRequest({ bookingId: '   ' }))
    expect(res.status).toBe(400)
  })

  it('returns 404 when booking not found', async () => {
    mockSingle.mockResolvedValue({ data: null })

    const { POST } = await import('../cancel/route')
    const res = await POST(makeRequest({ bookingId: 'b-nonexistent' }))
    expect(res.status).toBe(404)
  })

  it('returns 403 when user does not own the booking', async () => {
    mockBooking = { user_id: 'other-user', starts_at: new Date().toISOString(), status: 'confirmed' }
    mockSingle.mockResolvedValue({ data: mockBooking })

    const { POST } = await import('../cancel/route')
    const res = await POST(makeRequest({ bookingId: 'b-1' }))
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('Forbidden')
  })

  it('returns 400 when booking is not confirmed', async () => {
    mockBooking = { user_id: 'user-1', starts_at: new Date().toISOString(), status: 'completed' }
    mockSingle.mockResolvedValue({ data: mockBooking })

    const { POST } = await import('../cancel/route')
    const res = await POST(makeRequest({ bookingId: 'b-1' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Only confirmed bookings can be cancelled')
  })

  it('returns 500 when cancelBooking fails', async () => {
    mockCancelResult = { data: null, error: 'DB error' }

    const { POST } = await import('../cancel/route')
    const res = await POST(makeRequest({ bookingId: 'b-1' }))
    expect(res.status).toBe(500)
  })

  it('returns ok + creates flag on successful cancel after grace', async () => {
    const { POST } = await import('../cancel/route')
    const res = await POST(makeRequest({ bookingId: 'b-1' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.status).toBe('cancelled_customer')
    expect(json.flagType).toBe('soft')
  })

  it('returns ok + no flag on grace period cancel', async () => {
    mockCancelResult = {
      data: { status: 'cancelled_grace', isSameDay: false, minutesUntil: 120 },
      error: null,
    }

    const { POST } = await import('../cancel/route')
    const res = await POST(makeRequest({ bookingId: 'b-1' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.status).toBe('cancelled_grace')
    expect(json.flagType).toBeNull()
  })
})
