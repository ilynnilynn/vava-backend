import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ── Mock state ───────────────────────────────────────────────

let mockUser: { id: string } | null = null
let mockBooking: Record<string, unknown> | null = null
let mockSlot: Record<string, unknown> | null = null
let mockRequestRescheduleResult = { data: null, error: null as string | null }

// Track update calls
const mockUpdateEq = vi.fn()
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))

const mockSingle = vi.fn()
const mockEq = vi.fn((..._args: unknown[]) => ({ single: mockSingle, eq: mockEq }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect, update: mockUpdate }))
const mockRequireAuth = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

vi.mock('@/lib/bookings', () => ({
  requestReschedule: vi.fn(async () => mockRequestRescheduleResult),
}))

vi.mock('@/lib/notifications', () => ({
  notifyProRescheduleRequested: vi.fn(async () => {}),
}))

vi.mock('@/lib/utils', () => ({
  parseUTC: (v: string) => v,
}))

// ── Helpers ───────────────────────────────────────────────────

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/bookings/reschedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ── Tests ────────────────────────────────────────────────────

describe('POST /api/bookings/reschedule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = { id: 'user-1' }
    mockBooking = { user_id: 'user-1', pro_id: 'pro-1', slot_id: 'slot-old', status: 'confirmed' }
    mockSlot = { id: 'slot-new', pro_id: 'pro-1', starts_at: new Date(Date.now() + 7200000).toISOString(), is_booked: false, is_expired: false }
    mockRequestRescheduleResult = { data: null, error: null }

    mockRequireAuth.mockResolvedValue({ supabase: { from: mockFrom }, user: mockUser })

    // mockSingle returns different data based on call order:
    // 1st call: booking lookup
    // 2nd call: new slot lookup
    // 3rd+: pro/slot/user for notification
    let singleCallCount = 0
    mockSingle.mockImplementation(() => {
      singleCallCount++
      if (singleCallCount === 1) return { data: mockBooking }
      if (singleCallCount === 2) return { data: mockSlot }
      // For notification lookups
      return { data: { line_user_id: 'line-1', starts_at: new Date().toISOString(), name: 'Test User' } }
    })
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockResolvedValue({ error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) })

    const { POST } = await import('../reschedule/route')
    const res = await POST(makeRequest({ bookingId: 'b-1', newSlotId: 'slot-new' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when bookingId missing', async () => {
    const { POST } = await import('../reschedule/route')
    const res = await POST(makeRequest({ newSlotId: 'slot-new' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('bookingId and newSlotId are required')
  })

  it('returns 400 when newSlotId missing', async () => {
    const { POST } = await import('../reschedule/route')
    const res = await POST(makeRequest({ bookingId: 'b-1' }))
    expect(res.status).toBe(400)
  })

  it('returns 404 when booking not found', async () => {
    mockSingle.mockResolvedValueOnce({ data: null })

    const { POST } = await import('../reschedule/route')
    const res = await POST(makeRequest({ bookingId: 'b-1', newSlotId: 'slot-new' }))
    expect(res.status).toBe(404)
  })

  it('returns 403 when user does not own the booking', async () => {
    mockBooking = { user_id: 'other-user', pro_id: 'pro-1', slot_id: 'slot-old', status: 'confirmed' }
    mockSingle.mockResolvedValueOnce({ data: mockBooking })

    const { POST } = await import('../reschedule/route')
    const res = await POST(makeRequest({ bookingId: 'b-1', newSlotId: 'slot-new' }))
    expect(res.status).toBe(403)
  })

  it('returns 400 when booking is not confirmed', async () => {
    mockBooking = { user_id: 'user-1', pro_id: 'pro-1', slot_id: 'slot-old', status: 'completed' }
    mockSingle.mockResolvedValueOnce({ data: mockBooking })

    const { POST } = await import('../reschedule/route')
    const res = await POST(makeRequest({ bookingId: 'b-1', newSlotId: 'slot-new' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Only confirmed bookings can be rescheduled')
  })

  it('returns 409 when new slot is already booked', async () => {
    mockSlot = { id: 'slot-new', pro_id: 'pro-1', starts_at: new Date().toISOString(), is_booked: true, is_expired: false }
    let callCount = 0
    mockSingle.mockImplementation(() => {
      callCount++
      if (callCount === 1) return { data: mockBooking }
      return { data: mockSlot }
    })

    const { POST } = await import('../reschedule/route')
    const res = await POST(makeRequest({ bookingId: 'b-1', newSlotId: 'slot-new' }))
    expect(res.status).toBe(409)
  })

  it('returns 400 when requestReschedule returns 2hr error', async () => {
    mockRequestRescheduleResult = { data: null, error: 'Reschedule not allowed within 2 hours of session' }

    const { POST } = await import('../reschedule/route')
    const res = await POST(makeRequest({ bookingId: 'b-1', newSlotId: 'slot-new' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Reschedule not allowed within 2 hours of session')
  })

  it('returns ok on successful reschedule request', async () => {
    const { POST } = await import('../reschedule/route')
    const res = await POST(makeRequest({ bookingId: 'b-1', newSlotId: 'slot-new' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
  })
})
