import { describe, it, expect, vi, afterEach } from 'vitest'
import { getCancellationFlag } from '../flags'

/**
 * Tests the cancel timing matrix that drives BookingActions UI:
 * - Within 10min of booking creation → cancelled_grace → no flag
 * - > 2hr before session → soft flag
 * - < 30min before session → hard flag (same-day = true)
 * - Pro cancel → always hard
 */
describe('cancel timing logic (getCancellationFlag)', () => {
  afterEach(() => vi.useRealTimers())

  it('grace period → no flag', () => {
    const result = getCancellationFlag({
      actor: 'customer',
      bookingStatus: 'cancelled_grace',
      startsAt: new Date(Date.now() + 86400000).toISOString(),
    })
    expect(result).toBeNull()
  })

  it('customer cancel > 2hr before → soft flag', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-22T08:00:00Z'))

    const result = getCancellationFlag({
      actor: 'customer',
      bookingStatus: 'cancelled_customer',
      startsAt: '2026-03-22T14:00:00Z', // 6 hours away
    })
    expect(result).not.toBeNull()
    expect(result!.flagType).toBe('soft')
  })

  it('customer cancel exactly 30min before → soft flag (boundary)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-22T13:30:00Z'))

    const result = getCancellationFlag({
      actor: 'customer',
      bookingStatus: 'cancelled_customer',
      startsAt: '2026-03-22T14:00:00Z', // exactly 30 min away
    })
    expect(result).not.toBeNull()
    expect(result!.flagType).toBe('soft')
  })

  it('customer cancel 29min before → hard flag', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-22T13:31:00Z'))

    const result = getCancellationFlag({
      actor: 'customer',
      bookingStatus: 'cancelled_customer',
      startsAt: '2026-03-22T14:00:00Z', // 29 min away
    })
    expect(result).not.toBeNull()
    expect(result!.flagType).toBe('hard')
    expect(result!.isSameDay).toBe(true)
  })

  it('customer cancel 5min before → hard flag, same-day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-22T13:55:00Z'))

    const result = getCancellationFlag({
      actor: 'customer',
      bookingStatus: 'cancelled_customer',
      startsAt: '2026-03-22T14:00:00Z', // 5 min away
    })
    expect(result).not.toBeNull()
    expect(result!.flagType).toBe('hard')
    expect(result!.isSameDay).toBe(true)
  })

  it('pro cancel → always hard flag regardless of timing', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-20T08:00:00Z'))

    const result = getCancellationFlag({
      actor: 'pro',
      bookingStatus: 'cancelled_pro',
      startsAt: '2026-03-25T14:00:00Z', // 5 days away
    })
    expect(result).not.toBeNull()
    expect(result!.flagType).toBe('hard')
  })

  // Deliberate failure verification: flip expected value to prove test catches errors
  it('soft flag is not hard (sanity check)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-22T08:00:00Z'))

    const result = getCancellationFlag({
      actor: 'customer',
      bookingStatus: 'cancelled_customer',
      startsAt: '2026-03-22T14:00:00Z', // 6hr away → soft
    })
    expect(result!.flagType).not.toBe('hard')
  })
})
