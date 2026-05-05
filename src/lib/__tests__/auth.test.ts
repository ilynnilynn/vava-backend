import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { createRatingToken, verifyRatingToken } from '../auth'

describe('rating tokens', () => {
  beforeEach(() => {
    // Set env var needed by the token functions
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-secret-key-for-unit-tests'
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('round-trips: create → verify returns original data', () => {
    const token = createRatingToken('booking-123', 'user-456')
    const result = verifyRatingToken(token)
    expect(result.bookingId).toBe('booking-123')
    expect(result.userId).toBe('user-456')
  })

  it('rejects a tampered token', () => {
    const token = createRatingToken('booking-123', 'user-456')
    // Flip last char of signature
    const tampered = token.slice(0, -1) + (token.at(-1) === 'A' ? 'B' : 'A')
    expect(() => verifyRatingToken(tampered)).toThrow('signature invalid')
  })

  it('rejects a token with missing parts', () => {
    expect(() => verifyRatingToken('no-dot-here')).toThrow('Invalid rating token format')
  })

  it('rejects an expired token', () => {
    vi.useFakeTimers()
    // Create token at time T
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const token = createRatingToken('b-1', 'u-1')

    // Jump 8 days into the future (token TTL = 7 days)
    vi.setSystemTime(new Date('2026-01-09T00:00:01Z'))
    expect(() => verifyRatingToken(token)).toThrow('expired')
  })

  it('accepts a token just before expiry', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const token = createRatingToken('b-1', 'u-1')

    // Jump 6 days — still valid
    vi.setSystemTime(new Date('2026-01-07T00:00:00Z'))
    const result = verifyRatingToken(token)
    expect(result.bookingId).toBe('b-1')
  })
})
