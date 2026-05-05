import { describe, it, expect } from 'vitest'
import { parseUTC } from '../utils'

describe('parseUTC', () => {
  // The exact timestamp 2026-03-22T09:30:00Z in millis
  const expected = new Date('2026-03-22T09:30:00Z').getTime()

  it('parses Supabase format without timezone suffix as UTC', () => {
    // This is the format Supabase actually returns for timestamptz
    const result = parseUTC('2026-03-22T09:30:00')
    expect(result).toBe(expected)
  })

  it('parses ISO string with Z suffix correctly', () => {
    const result = parseUTC('2026-03-22T09:30:00.000Z')
    expect(result).toBe(expected)
  })

  it('parses ISO string with +00:00 offset correctly', () => {
    const result = parseUTC('2026-03-22T09:30:00+00:00')
    expect(result).toBe(expected)
  })

  it('does NOT equal naive Date parse of tz-less string (the bug)', () => {
    // This proves the bug exists: without parseUTC, JS treats
    // "2026-03-22T09:30:00" as local time, which differs from UTC
    // in any timezone that isn't UTC itself.
    const naive = new Date('2026-03-22T09:30:00').getTime()
    const fixed = parseUTC('2026-03-22T09:30:00')

    // In UTC environment (CI), these happen to be equal.
    // The important invariant: parseUTC always returns the UTC value.
    expect(fixed).toBe(expected)

    // If running in a non-UTC timezone, naive would differ:
    const tzOffsetMs = new Date().getTimezoneOffset() * 60000
    if (tzOffsetMs !== 0) {
      expect(naive).not.toBe(expected)
    }
  })

  it('minute-floor comparison matches Supabase slot to generated time', () => {
    // Simulate: user clicks a slot generated at 09:30 UTC
    const generatedTime = new Date('2026-03-22T09:30:00.000Z')
    // Supabase returns this after insert:
    const supabaseStartsAt = '2026-03-22T09:30:00'

    const targetMinute = Math.floor(generatedTime.getTime() / 60000)
    const slotMinute = Math.floor(parseUTC(supabaseStartsAt) / 60000)

    expect(slotMinute).toBe(targetMinute)
  })
})
