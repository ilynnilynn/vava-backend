import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mock state ───────────────────────────────────────────────

let mockUser: { id: string } | null = null
let mockBooking: Record<string, unknown> | null = null
let mockResolveResult = { data: null, error: null as string | null }

const mockUpdateEq = vi.fn()
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))

const mockSingle = vi.fn()
const mockEq = vi.fn((..._args: unknown[]) => ({ single: mockSingle, eq: mockEq }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect, update: mockUpdate }))
const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

vi.mock('@/lib/bookings', () => ({
  resolveReschedule: vi.fn(async () => mockResolveResult),
}))

vi.mock('@/lib/notifications', () => ({
  notifyCustomerRescheduleOutcome: vi.fn(async () => {}),
}))

vi.mock('@/lib/utils', () => ({
  parseUTC: (v: string) => v,
}))

// ── Helpers ───────────────────────────────────────────────────

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/bookings/reschedule/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ── Tests ────────────────────────────────────────────────────

describe('POST /api/bookings/reschedule/resolve', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = { id: 'pro-1' }
    mockBooking = { pro_id: 'pro-1', user_id: 'user-1', status: 'reschedule_pending', proposed_slot_id: 'slot-new' }
    mockResolveResult = { data: null, error: null }

    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })

    let callCount = 0
    mockSingle.mockImplementation(() => {
      callCount++
      if (callCount === 1) return { data: mockBooking }
      // Customer lookup for notification
      return { data: { line_user_id: 'line-customer', starts_at: new Date().toISOString() } }
    })
  })

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no session' } })

    const { POST } = await import('../reschedule/resolve/route')
    const res = await POST(makeRequest({ bookingId: 'b-1', approved: true }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when bookingId missing', async () => {
    const { POST } = await import('../reschedule/resolve/route')
    const res = await POST(makeRequest({ approved: true }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when approved missing', async () => {
    const { POST } = await import('../reschedule/resolve/route')
    const res = await POST(makeRequest({ bookingId: 'b-1' }))
    expect(res.status).toBe(400)
  })

  it('returns 404 when booking not found', async () => {
    mockSingle.mockResolvedValueOnce({ data: null })

    const { POST } = await import('../reschedule/resolve/route')
    const res = await POST(makeRequest({ bookingId: 'b-1', approved: true }))
    expect(res.status).toBe(404)
  })

  it('returns 403 when caller is not the pro', async () => {
    mockUser = { id: 'other-pro' }
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })

    const { POST } = await import('../reschedule/resolve/route')
    const res = await POST(makeRequest({ bookingId: 'b-1', approved: true }))
    expect(res.status).toBe(403)
  })

  it('returns 400 when booking is not reschedule_pending', async () => {
    mockBooking = { pro_id: 'pro-1', user_id: 'user-1', status: 'confirmed', proposed_slot_id: null }
    mockSingle.mockResolvedValueOnce({ data: mockBooking })

    const { POST } = await import('../reschedule/resolve/route')
    const res = await POST(makeRequest({ bookingId: 'b-1', approved: true }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Booking is not pending reschedule')
  })

  it('returns ok when approved', async () => {
    const { POST } = await import('../reschedule/resolve/route')
    const res = await POST(makeRequest({ bookingId: 'b-1', approved: true }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
  })

  it('returns ok when declined', async () => {
    const { POST } = await import('../reschedule/resolve/route')
    const res = await POST(makeRequest({ bookingId: 'b-1', approved: false }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
  })

  it('returns 400 when resolveReschedule returns error', async () => {
    mockResolveResult = { data: null, error: 'newSlotId required when approved = true' }

    const { POST } = await import('../reschedule/resolve/route')
    const res = await POST(makeRequest({ bookingId: 'b-1', approved: true }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('newSlotId required when approved = true')
  })
})
