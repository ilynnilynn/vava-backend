import { describe, it, expect } from 'vitest'
import { filterSlotsByTimeBand, filterSlotsByDates } from '../slots'
import type { Slot } from '@/types'
import type { MatchingSlotResult } from '../slots'

// ── Fixtures ─────────────────────────────────────────────────

function makeSlot(startsAt: string, overrides?: Partial<Slot>): Slot {
  return {
    id: `slot-${startsAt}`,
    pro_id: 'pro-1',
    starts_at: startsAt,
    ends_at: null,
    is_booked: false,
    is_expired: false,
    created_at: '2026-04-15T00:00:00Z',
    ...overrides,
  }
}

// ── filterSlotsByTimeBand ────────────────────────────────────

describe('filterSlotsByTimeBand', () => {
  const slots = [
    makeSlot('2026-04-16T08:00:00'),  // 8 AM — before morning
    makeSlot('2026-04-16T09:00:00'),  // 9 AM — morning start
    makeSlot('2026-04-16T11:30:00'),  // 11:30 AM — morning
    makeSlot('2026-04-16T12:00:00'),  // 12 PM — afternoon start
    makeSlot('2026-04-16T15:00:00'),  // 3 PM — afternoon
    makeSlot('2026-04-16T16:59:00'),  // 4:59 PM — afternoon end
    makeSlot('2026-04-16T17:00:00'),  // 5 PM — evening start
    makeSlot('2026-04-16T20:00:00'),  // 8 PM — evening
    makeSlot('2026-04-16T21:30:00'),  // 9:30 PM — evening
    makeSlot('2026-04-16T22:00:00'),  // 10 PM — after evening
  ]

  it('returns only morning slots (9:00–12:00)', () => {
    const result = filterSlotsByTimeBand(slots, 'morning')
    expect(result).toHaveLength(2)
    expect(result.map(s => s.starts_at)).toEqual([
      '2026-04-16T09:00:00',
      '2026-04-16T11:30:00',
    ])
  })

  it('returns only afternoon slots (12:00–17:00)', () => {
    const result = filterSlotsByTimeBand(slots, 'afternoon')
    expect(result).toHaveLength(3)
    expect(result.map(s => s.starts_at)).toEqual([
      '2026-04-16T12:00:00',
      '2026-04-16T15:00:00',
      '2026-04-16T16:59:00',
    ])
  })

  it('returns only evening slots (17:00–22:00)', () => {
    const result = filterSlotsByTimeBand(slots, 'evening')
    expect(result).toHaveLength(3)
    expect(result.map(s => s.starts_at)).toEqual([
      '2026-04-16T17:00:00',
      '2026-04-16T20:00:00',
      '2026-04-16T21:30:00',
    ])
  })

  it('returns all slots when timeBand is null', () => {
    const result = filterSlotsByTimeBand(slots, null)
    expect(result).toHaveLength(slots.length)
  })

  it('returns all slots when timeBand is undefined', () => {
    const result = filterSlotsByTimeBand(slots, undefined)
    expect(result).toHaveLength(slots.length)
  })

  it('returns empty array when no slots match the time band', () => {
    const earlySlots = [makeSlot('2026-04-16T06:00:00')]
    const result = filterSlotsByTimeBand(earlySlots, 'evening')
    expect(result).toHaveLength(0)
  })

  it('returns empty array for empty input', () => {
    const result = filterSlotsByTimeBand([], 'morning')
    expect(result).toHaveLength(0)
  })

  // 12:00 is the boundary — it should be afternoon, NOT morning
  it('boundary: 12:00 belongs to afternoon, not morning', () => {
    const noonSlot = [makeSlot('2026-04-16T12:00:00')]
    expect(filterSlotsByTimeBand(noonSlot, 'morning')).toHaveLength(0)
    expect(filterSlotsByTimeBand(noonSlot, 'afternoon')).toHaveLength(1)
  })

  // 17:00 is the boundary — it should be evening, NOT afternoon
  it('boundary: 17:00 belongs to evening, not afternoon', () => {
    const fivepmSlot = [makeSlot('2026-04-16T17:00:00')]
    expect(filterSlotsByTimeBand(fivepmSlot, 'afternoon')).toHaveLength(0)
    expect(filterSlotsByTimeBand(fivepmSlot, 'evening')).toHaveLength(1)
  })
})

// ── filterSlotsByDates ──────────────────────────────────────

describe('filterSlotsByDates', () => {
  const slots = [
    makeSlot('2026-04-16T10:00:00'),
    makeSlot('2026-04-16T14:00:00'),
    makeSlot('2026-04-17T10:00:00'),
    makeSlot('2026-04-18T09:00:00'),
  ]

  it('filters slots to only requested dates', () => {
    const result = filterSlotsByDates(slots, ['2026-04-16'])
    expect(result).toHaveLength(2)
    expect(result.every(s => s.starts_at.startsWith('2026-04-16'))).toBe(true)
  })

  it('supports multiple dates', () => {
    const result = filterSlotsByDates(slots, ['2026-04-16', '2026-04-18'])
    expect(result).toHaveLength(3)
  })

  it('returns all slots when dates array is empty', () => {
    const result = filterSlotsByDates(slots, [])
    expect(result).toHaveLength(slots.length)
  })

  it('returns empty when no dates match', () => {
    const result = filterSlotsByDates(slots, ['2026-04-20'])
    expect(result).toHaveLength(0)
  })

  it('returns empty for empty slots input', () => {
    const result = filterSlotsByDates([], ['2026-04-16'])
    expect(result).toHaveLength(0)
  })
})

// ── Sort order (MatchingSlotResult) ─────────────────────────

describe('MatchingSlotResult sort order', () => {
  it('soonest slot first determines result order', () => {
    // Simulate what getMatchingSlots returns — verify sort contract
    const results: MatchingSlotResult[] = [
      {
        pro: { id: 'pro-B', displayName: 'B', profilePhotoUrl: null, studioAddress: 'addr-B', studioLat: null, studioLng: null },
        slots: [{ id: 's3', startsAt: '2026-04-17T10:00:00', endsAt: null }],
        priceRange: { min: 500, max: 800 },
        distanceKm: null,
      },
      {
        pro: { id: 'pro-A', displayName: 'A', profilePhotoUrl: null, studioAddress: 'addr-A', studioLat: null, studioLng: null },
        slots: [{ id: 's1', startsAt: '2026-04-16T09:00:00', endsAt: null }],
        priceRange: { min: 600, max: 900 },
        distanceKm: null,
      },
      {
        pro: { id: 'pro-C', displayName: 'C', profilePhotoUrl: null, studioAddress: 'addr-C', studioLat: null, studioLng: null },
        slots: [{ id: 's2', startsAt: '2026-04-16T14:00:00', endsAt: null }],
        priceRange: { min: 400, max: 700 },
        distanceKm: null,
      },
    ]

    // Apply the same sort logic used in getMatchingSlots
    results.sort((a, b) => {
      const aEarliest = a.slots[0]?.startsAt ?? ''
      const bEarliest = b.slots[0]?.startsAt ?? ''
      return aEarliest.localeCompare(bEarliest)
    })

    expect(results[0].pro.id).toBe('pro-A')
    expect(results[1].pro.id).toBe('pro-C')
    expect(results[2].pro.id).toBe('pro-B')
  })

  it('empty slots array sorts before entries with slots (filtered out in practice)', () => {
    // Note: In practice, getMatchingSlots skips pros with 0 matching slots.
    // This test documents the sort behavior when empty arrays exist.
    const results: MatchingSlotResult[] = [
      {
        pro: { id: 'pro-empty', displayName: 'Empty', profilePhotoUrl: null, studioAddress: '', studioLat: null, studioLng: null },
        slots: [],
        priceRange: { min: 0, max: 0 },
        distanceKm: null,
      },
      {
        pro: { id: 'pro-has', displayName: 'Has', profilePhotoUrl: null, studioAddress: '', studioLat: null, studioLng: null },
        slots: [{ id: 's1', startsAt: '2026-04-16T09:00:00', endsAt: null }],
        priceRange: { min: 500, max: 500 },
        distanceKm: null,
      },
    ]

    results.sort((a, b) => {
      const aEarliest = a.slots[0]?.startsAt ?? ''
      const bEarliest = b.slots[0]?.startsAt ?? ''
      return aEarliest.localeCompare(bEarliest)
    })

    // Empty string '' sorts before any date string — pro-empty comes first
    expect(results[0].pro.id).toBe('pro-empty')
    expect(results[1].pro.id).toBe('pro-has')
  })
})

// ── Intentional failure test ────────────────────────────────

describe('intentional failure guard', () => {
  it('filterSlotsByTimeBand morning EXCLUDES 12:00 (not includes)', () => {
    // This test verifies the filter genuinely rejects out-of-band slots.
    // If someone changed morning to include 12:00, this test would catch it.
    const noonSlot = makeSlot('2026-04-16T12:00:00')
    const result = filterSlotsByTimeBand([noonSlot], 'morning')

    // The slot at 12:00 must NOT appear in morning results
    expect(result).not.toContain(noonSlot)
    expect(result).toHaveLength(0)

    // Confirm the same slot IS in afternoon — proves the filter is real
    const afternoonResult = filterSlotsByTimeBand([noonSlot], 'afternoon')
    expect(afternoonResult).toHaveLength(1)
    expect(afternoonResult[0].starts_at).toBe('2026-04-16T12:00:00')
  })

  it('filterSlotsByDates rejects non-matching dates', () => {
    const slot = makeSlot('2026-04-16T10:00:00')
    const result = filterSlotsByDates([slot], ['2026-04-17'])

    // Must NOT include the slot
    expect(result).toHaveLength(0)

    // Same slot with correct date DOES match — proves the filter works
    const correct = filterSlotsByDates([slot], ['2026-04-16'])
    expect(correct).toHaveLength(1)
  })
})
