// myApp/__tests__/slots-api.test.ts
//
// Tests for slots-api grid generation logic.
// We test the pure derivation behaviour without hitting Supabase.
// The USE_MOCK=false path is integration-tested manually against a real DB.

import { deriveSlotState } from '../lib/pro-helpers'

// ── Grid shape ────────────────────────────────────────────────
// Replicates the grid-generation logic from fetchSlots() so we can
// verify the expected slot count and time boundaries without mocking
// the Supabase client.

const START_HOUR = 11
const END_HOUR = 20

function buildGrid(baseMidnight: Date): { startsAt: Date; h: number; m: number }[] {
  const result: { startsAt: Date; h: number; m: number }[] = []
  for (let day = 0; day < 3; day++) {
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      const minutes = h < END_HOUR ? [0, 30] : [0]
      for (const m of minutes) {
        const t = new Date(baseMidnight)
        t.setDate(t.getDate() + day)
        t.setHours(h, m, 0, 0)
        result.push({ startsAt: t, h, m })
      }
    }
  }
  return result
}

describe('slot grid generation', () => {
  const midnight = new Date('2026-04-27T00:00:00')

  it('produces 57 slots over 3 days (19 per day)', () => {
    // 11:00 to 20:00 at 30-min = 19 slots per day (11:00…19:30 + 20:00)
    const grid = buildGrid(midnight)
    expect(grid).toHaveLength(57)
  })

  it('first slot of each day is START_HOUR:00', () => {
    const grid = buildGrid(midnight)
    const day0First = grid[0]
    const day1First = grid[19]
    const day2First = grid[38]
    expect(day0First.h).toBe(START_HOUR)
    expect(day0First.m).toBe(0)
    expect(day1First.h).toBe(START_HOUR)
    expect(day2First.h).toBe(START_HOUR)
  })

  it('last slot of each day is END_HOUR:00', () => {
    const grid = buildGrid(midnight)
    const day0Last = grid[18]
    const day1Last = grid[37]
    const day2Last = grid[56]
    expect(day0Last.h).toBe(END_HOUR)
    expect(day0Last.m).toBe(0)
    expect(day1Last.h).toBe(END_HOUR)
    expect(day2Last.h).toBe(END_HOUR)
  })

  it('only contains :00 and :30 minute marks', () => {
    const grid = buildGrid(midnight)
    for (const slot of grid) {
      expect([0, 30]).toContain(slot.m)
    }
  })

  it('day 1 slots are on the next calendar date', () => {
    const grid = buildGrid(midnight)
    const day0Date = grid[0].startsAt.getDate()
    const day1Date = grid[19].startsAt.getDate()
    expect(day1Date).toBe(day0Date + 1)
  })
})

// ── Unauthenticated path: empty slotMap → all slots available or expired ──

describe('slot state with empty slotMap (unauthenticated)', () => {
  const now = new Date('2026-04-27T03:00:00.000Z') // 11:00 Taiwan time

  it('future slots with no DB rows derive as available', () => {
    const futureIso = new Date('2026-04-27T05:00:00.000Z').toISOString() // 13:00 Taiwan
    expect(deriveSlotState(futureIso, false, false, now)).toBe('available')
  })

  it('past slots derive as expired', () => {
    const pastIso = new Date('2026-04-27T01:00:00.000Z').toISOString() // 09:00 Taiwan
    expect(deriveSlotState(pastIso, false, false, now)).toBe('expired')
  })
})

// ── Authenticated path: slotMap populated from DB rows ────────

describe('slot state with populated slotMap (authenticated)', () => {
  const now = new Date('2026-04-27T03:00:00.000Z')

  it('open slot (in DB, not booked) derives as open', () => {
    const iso = new Date('2026-04-27T05:00:00.000Z').toISOString()
    // match !== null && !match.isBooked → isOpen=true, isBooked=false
    expect(deriveSlotState(iso, true, false, now)).toBe('open')
  })

  it('booked slot derives as booked', () => {
    const iso = new Date('2026-04-27T05:00:00.000Z').toISOString()
    expect(deriveSlotState(iso, false, true, now)).toBe('booked')
  })

  it('slot in DB but now in the past derives as expired', () => {
    const pastIso = new Date('2026-04-27T01:00:00.000Z').toISOString()
    expect(deriveSlotState(pastIso, true, false, now)).toBe('expired')
  })
})

// ── Timestamp key matching ────────────────────────────────────
// Verify that ms-based keying handles UTC vs +00:00 format differences

describe('timestamp key normalisation', () => {
  it('getTime() is equal for "Z" and "+00:00" representations of the same moment', () => {
    const utcZ    = new Date('2026-04-27T03:00:00.000Z').getTime()
    const utcPlus = new Date('2026-04-27T03:00:00+00:00').getTime()
    expect(utcZ).toBe(utcPlus)
  })

  it('getTime() differs for the same wall-clock hour in different offsets', () => {
    const local8 = new Date('2026-04-27T11:00:00+08:00').getTime() // 03:00 UTC
    const local0 = new Date('2026-04-27T11:00:00+00:00').getTime() // 11:00 UTC
    expect(local8).not.toBe(local0)
  })
})
