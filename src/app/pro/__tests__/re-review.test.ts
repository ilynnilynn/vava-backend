import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock state ───────────────────────────────────────────────

let mockProId: string | null = 'pro-1'
let mockCurrentPro: Record<string, unknown> | null = { display_name: 'Alice', studio_address: '台北市大安區' }
let lastUpdate: Record<string, unknown> | null = null

const mockUpdateEq = vi.fn()
const mockUpdate = vi.fn((data: Record<string, unknown>) => {
  lastUpdate = data
  return { eq: mockUpdateEq }
})

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

vi.mock('@/lib/pros', () => ({
  setAccepting: vi.fn(async () => ({ data: null, error: null })),
}))

vi.mock('@/lib/slots', () => ({
  addSlot: vi.fn(async () => ({ data: null, error: null })),
  removeSlot: vi.fn(async () => ({ data: null, error: null })),
}))

vi.mock('@/lib/bookings', () => ({
  cancelBooking: vi.fn(async () => ({ data: null, error: null })),
  completeBooking: vi.fn(async () => ({ data: null, error: null })),
  markNoShow: vi.fn(async () => ({ data: null, error: null })),
  resolveReschedule: vi.fn(async () => ({ data: null, error: null })),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// ── Tests ────────────────────────────────────────────────────

describe('updateSettings re-review', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProId = 'pro-1'
    mockCurrentPro = { display_name: 'Alice', studio_address: '台北市大安區' }
    lastUpdate = null

    // getUser → user with id = pro-1
    mockGetUser.mockResolvedValue({ data: { user: { id: mockProId } }, error: null })

    // First single() → pro id check, second → current pro data
    let callCount = 0
    mockSingle.mockImplementation(() => {
      callCount++
      if (callCount === 1) return { data: { id: mockProId } }
      return { data: mockCurrentPro }
    })

    mockUpdateEq.mockReturnValue({ error: null })
  })

  it('does NOT set is_approved=false when name unchanged', async () => {
    const { updateSettings } = await import('../../pro/(auth)/dashboard/actions')
    await updateSettings({
      display_name: 'Alice', // same as current
      studio_address: '台北市大安區', // same as current
      phone: '0912345678',
    })

    expect(lastUpdate).not.toBeNull()
    expect(lastUpdate!.is_approved).toBeUndefined()
  })

  it('sets is_approved=false when display_name changes', async () => {
    const { updateSettings } = await import('../../pro/(auth)/dashboard/actions')
    await updateSettings({
      display_name: 'Bob', // changed
      studio_address: '台北市大安區',
      phone: '0912345678',
    })

    expect(lastUpdate).not.toBeNull()
    expect(lastUpdate!.is_approved).toBe(false)
    expect(lastUpdate!.submitted_at).toBeDefined()
  })

  it('sets is_approved=false when studio_address changes', async () => {
    const { updateSettings } = await import('../../pro/(auth)/dashboard/actions')
    await updateSettings({
      display_name: 'Alice',
      studio_address: '台北市信義區', // changed
      phone: '0912345678',
    })

    expect(lastUpdate).not.toBeNull()
    expect(lastUpdate!.is_approved).toBe(false)
    expect(lastUpdate!.submitted_at).toBeDefined()
  })

  it('does NOT re-review when only phone changes', async () => {
    const { updateSettings } = await import('../../pro/(auth)/dashboard/actions')
    await updateSettings({
      phone: '0999999999',
    })

    expect(lastUpdate).not.toBeNull()
    expect(lastUpdate!.is_approved).toBeUndefined()
  })
})
