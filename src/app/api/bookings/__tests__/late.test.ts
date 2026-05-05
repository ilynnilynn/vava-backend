import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mock Supabase ─────────────────────────────────────────────

let mockUser: { id: string } | null = null
let mockBooking: Record<string, unknown> | null = null
let mockUpdateError: { message: string } | null = null

const mockUpdateEq = vi.fn()
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
const mockSingle = vi.fn()
const mockEq = vi.fn(() => ({ single: mockSingle, eq: mockEq }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn((table: string) => {
  if (table === 'bookings') {
    return { select: mockSelect, update: mockUpdate }
  }
  return { select: mockSelect }
})
const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/bookings/late', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/bookings/late', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = { id: 'user-1' }
    mockBooking = { user_id: 'user-1', status: 'confirmed' }
    mockUpdateError = null
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockSingle.mockResolvedValue({ data: mockBooking })
    mockUpdateEq.mockResolvedValue({ error: mockUpdateError })
  })

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no session' } })

    const { POST } = await import('../late/route')
    const res = await POST(makeRequest({ bookingId: 'b-1' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when bookingId missing', async () => {
    const { POST } = await import('../late/route')
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('returns 404 when booking not found', async () => {
    mockSingle.mockResolvedValue({ data: null })

    const { POST } = await import('../late/route')
    const res = await POST(makeRequest({ bookingId: 'b-1' }))
    expect(res.status).toBe(404)
  })

  it('returns 403 when user does not own booking', async () => {
    mockBooking = { user_id: 'other-user', status: 'confirmed' }
    mockSingle.mockResolvedValue({ data: mockBooking })

    const { POST } = await import('../late/route')
    const res = await POST(makeRequest({ bookingId: 'b-1' }))
    expect(res.status).toBe(403)
  })

  it('returns 400 when booking is not confirmed', async () => {
    mockBooking = { user_id: 'user-1', status: 'completed' }
    mockSingle.mockResolvedValue({ data: mockBooking })

    const { POST } = await import('../late/route')
    const res = await POST(makeRequest({ bookingId: 'b-1' }))
    expect(res.status).toBe(400)
  })

  it('returns ok on success', async () => {
    const { POST } = await import('../late/route')
    const res = await POST(makeRequest({ bookingId: 'b-1' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
  })
})
