import { describe, it, expect, vi, afterEach } from 'vitest'
import { computeStanding, getCancellationFlag } from '../flags'
import type { Flag } from '@/types/database'

// ── computeStanding ──────────────────────────────────────────

function makeFlag(overrides: Partial<Flag> = {}): Flag {
  return {
    id: 'flag-1',
    booking_id: 'b-1',
    flagged_entity: 'pro',
    flagged_id: 'pro-1',
    flag_type: 'soft',
    is_same_day: false,
    note: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('computeStanding', () => {
  it('returns "good" with no flags', () => {
    expect(computeStanding([])).toBe('good')
  })

  it('returns "good" with 1 soft flag', () => {
    expect(computeStanding([makeFlag({ flag_type: 'soft' })])).toBe('good')
  })

  it('returns "warning" with 2 soft flags', () => {
    const flags = [
      makeFlag({ flag_type: 'soft' }),
      makeFlag({ flag_type: 'soft' }),
    ]
    expect(computeStanding(flags)).toBe('warning')
  })

  it('returns "warning" with 1 hard flag', () => {
    expect(computeStanding([makeFlag({ flag_type: 'hard' })])).toBe('warning')
  })

  it('returns "at_risk" with 3 soft flags', () => {
    const flags = Array.from({ length: 3 }, () => makeFlag({ flag_type: 'soft' }))
    expect(computeStanding(flags)).toBe('at_risk')
  })

  it('returns "at_risk" with 2 hard flags', () => {
    const flags = [
      makeFlag({ flag_type: 'hard' }),
      makeFlag({ flag_type: 'hard' }),
    ]
    expect(computeStanding(flags)).toBe('at_risk')
  })

  it('returns "at_risk" with 1 same-day flag', () => {
    expect(computeStanding([makeFlag({ is_same_day: true })])).toBe('at_risk')
  })

  it('returns "suspended" with 2 same-day flags', () => {
    const flags = [
      makeFlag({ is_same_day: true }),
      makeFlag({ is_same_day: true }),
    ]
    expect(computeStanding(flags)).toBe('suspended')
  })

  it('returns "suspended" with 1 no_show flag', () => {
    expect(computeStanding([makeFlag({ flag_type: 'no_show' })])).toBe('suspended')
  })
})

// ── getCancellationFlag ──────────────────────────────────────

describe('getCancellationFlag', () => {
  afterEach(() => vi.useRealTimers())

  it('returns null for grace period cancellation', () => {
    const result = getCancellationFlag({
      actor: 'customer',
      bookingStatus: 'cancelled_grace',
      startsAt: new Date(Date.now() + 3600000).toISOString(),
    })
    expect(result).toBeNull()
  })

  it('returns hard flag for pro cancellation', () => {
    const result = getCancellationFlag({
      actor: 'pro',
      bookingStatus: 'cancelled_pro',
      startsAt: new Date(Date.now() + 7200000).toISOString(), // 2 hours away
    })
    expect(result).not.toBeNull()
    expect(result!.flagType).toBe('hard')
  })

  it('returns hard flag for customer cancel <30min before', () => {
    vi.useFakeTimers()
    const now = new Date('2026-03-21T14:00:00Z')
    vi.setSystemTime(now)

    const result = getCancellationFlag({
      actor: 'customer',
      bookingStatus: 'cancelled_customer',
      startsAt: '2026-03-21T14:20:00Z', // 20 min away
    })
    expect(result).not.toBeNull()
    expect(result!.flagType).toBe('hard')
    expect(result!.isSameDay).toBe(true)
  })

  it('returns soft flag for customer cancel ≥30min before', () => {
    vi.useFakeTimers()
    const now = new Date('2026-03-21T10:00:00Z')
    vi.setSystemTime(now)

    const result = getCancellationFlag({
      actor: 'customer',
      bookingStatus: 'cancelled_customer',
      startsAt: '2026-03-21T14:00:00Z', // 4 hours away
    })
    expect(result).not.toBeNull()
    expect(result!.flagType).toBe('soft')
  })
})
