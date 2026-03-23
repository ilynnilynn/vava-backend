import { describe, it, expect } from 'vitest'
import { hasTimeOverlap } from '../overlap'

describe('hasTimeOverlap', () => {
  const existing = [
    { starts_at: '2026-03-25T10:00:00Z', session_ends_at: '2026-03-25T12:00:00Z' },
    { starts_at: '2026-03-25T14:00:00Z', session_ends_at: '2026-03-25T16:00:00Z' },
  ]

  it('returns false when no overlap', () => {
    expect(hasTimeOverlap(existing, '2026-03-25T12:00:00Z', '2026-03-25T14:00:00Z')).toBe(false)
  })

  it('returns false when new booking is entirely before', () => {
    expect(hasTimeOverlap(existing, '2026-03-25T08:00:00Z', '2026-03-25T10:00:00Z')).toBe(false)
  })

  it('returns false when new booking is entirely after', () => {
    expect(hasTimeOverlap(existing, '2026-03-25T16:00:00Z', '2026-03-25T18:00:00Z')).toBe(false)
  })

  it('returns true when new booking overlaps start of existing', () => {
    expect(hasTimeOverlap(existing, '2026-03-25T09:00:00Z', '2026-03-25T11:00:00Z')).toBe(true)
  })

  it('returns true when new booking overlaps end of existing', () => {
    expect(hasTimeOverlap(existing, '2026-03-25T11:00:00Z', '2026-03-25T13:00:00Z')).toBe(true)
  })

  it('returns true when new booking is entirely inside existing', () => {
    expect(hasTimeOverlap(existing, '2026-03-25T10:30:00Z', '2026-03-25T11:30:00Z')).toBe(true)
  })

  it('returns true when new booking fully contains existing', () => {
    expect(hasTimeOverlap(existing, '2026-03-25T09:00:00Z', '2026-03-25T13:00:00Z')).toBe(true)
  })

  it('returns false for empty existing bookings', () => {
    expect(hasTimeOverlap([], '2026-03-25T10:00:00Z', '2026-03-25T12:00:00Z')).toBe(false)
  })

  it('returns true when overlapping second existing booking', () => {
    expect(hasTimeOverlap(existing, '2026-03-25T15:00:00Z', '2026-03-25T17:00:00Z')).toBe(true)
  })

  // Edge: exact boundary (touching but not overlapping)
  it('returns false when new booking starts exactly when existing ends', () => {
    expect(hasTimeOverlap(existing, '2026-03-25T12:00:00Z', '2026-03-25T13:00:00Z')).toBe(false)
  })

  it('returns false when new booking ends exactly when existing starts', () => {
    expect(hasTimeOverlap(existing, '2026-03-25T13:00:00Z', '2026-03-25T14:00:00Z')).toBe(false)
  })
})
