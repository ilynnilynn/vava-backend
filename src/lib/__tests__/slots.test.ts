import { describe, it, expect, vi, afterEach } from 'vitest'
import { formatSlotTime, generateSlotOptions, reconstructBlocks } from '../slots'
import type { Slot } from '@/types'

// Helper to create a Slot fixture
function makeSlot(startsAt: string, overrides?: Partial<Slot>): Slot {
  return {
    id: `slot-${startsAt}`,
    pro_id: 'pro-1',
    starts_at: startsAt,
    ends_at: null,
    is_booked: false,
    is_expired: false,
    created_at: '2026-03-22T00:00:00Z',
    ...overrides,
  }
}

describe('formatSlotTime', () => {
  it('formats time in zh-TW locale (24h)', () => {
    const result = formatSlotTime('2026-03-21T15:30:00Z', 'zh')
    expect(result).toContain('30')
  })

  it('formats time in en-US locale (12h)', () => {
    const result = formatSlotTime('2026-03-21T15:30:00Z', 'en')
    expect(result).toContain('30')
    expect(result).toMatch(/AM|PM/)
  })

  it('defaults to zh locale', () => {
    const zh = formatSlotTime('2026-03-21T09:00:00Z')
    expect(zh).not.toMatch(/AM|PM/)
  })
})

describe('generateSlotOptions with working hours', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('filters slots to working hours range (30-min increments)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-22T00:00:00'))

    const day = new Date('2026-03-22')
    const slots = generateSlotOptions(day, 10, 14)

    expect(slots.length).toBeGreaterThan(0)

    const hours = slots.map(s => s.getHours())
    expect(Math.min(...hours)).toBe(10)
    expect(Math.max(...hours)).toBe(13) // 13:30 is last slot before 14:00

    // 4 hours × 2 per hour (30-min) = 8
    expect(slots.length).toBe(8)
  })

  it('defaults to full day (0–24) when no hours given', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-22T00:00:00'))

    const day = new Date('2026-03-22')
    const full = generateSlotOptions(day)
    const filtered = generateSlotOptions(day, 10, 20)

    expect(full.length).toBeGreaterThan(filtered.length)
  })

  it('end hour is exclusive — endHour=20 means last slot is 19:30', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-22T00:00:00'))

    const day = new Date('2026-03-22')
    const slots = generateSlotOptions(day, 10, 20)
    const lastSlot = slots[slots.length - 1]

    expect(lastSlot.getHours()).toBe(19)
    expect(lastSlot.getMinutes()).toBe(30)
  })
})

describe('reconstructBlocks', () => {
  it('returns empty record for empty input', () => {
    expect(reconstructBlocks([])).toEqual({})
  })

  it('groups consecutive unbooked slots into one block', () => {
    const slots = [
      makeSlot('2026-03-22T10:00:00'),
      makeSlot('2026-03-22T10:30:00'),
      makeSlot('2026-03-22T11:00:00'),
    ]

    const blocks = reconstructBlocks(slots)
    const dayBlocks = blocks['2026-03-22']

    expect(dayBlocks).toHaveLength(1)
    expect(dayBlocks[0].startTime).toBe('10:00')
    expect(dayBlocks[0].endTime).toBe('11:30')
    expect(dayBlocks[0].isBooked).toBe(false)
    expect(dayBlocks[0].slotIds).toHaveLength(3)
  })

  it('splits at booked/unbooked boundary', () => {
    const slots = [
      makeSlot('2026-03-22T10:00:00'),
      makeSlot('2026-03-22T10:30:00', { is_booked: true }),
      makeSlot('2026-03-22T11:00:00'),
    ]

    const blocks = reconstructBlocks(slots)
    const dayBlocks = blocks['2026-03-22']

    expect(dayBlocks).toHaveLength(3)
    expect(dayBlocks[0]).toMatchObject({ startTime: '10:00', endTime: '10:30', isBooked: false })
    expect(dayBlocks[1]).toMatchObject({ startTime: '10:30', endTime: '11:00', isBooked: true })
    expect(dayBlocks[2]).toMatchObject({ startTime: '11:00', endTime: '11:30', isBooked: false })
  })

  it('creates separate blocks for gaps between slots', () => {
    const slots = [
      makeSlot('2026-03-22T10:00:00'),
      makeSlot('2026-03-22T10:30:00'),
      // Gap: 11:00 missing
      makeSlot('2026-03-22T11:30:00'),
      makeSlot('2026-03-22T12:00:00'),
    ]

    const blocks = reconstructBlocks(slots)
    const dayBlocks = blocks['2026-03-22']

    expect(dayBlocks).toHaveLength(2)
    expect(dayBlocks[0]).toMatchObject({ startTime: '10:00', endTime: '11:00' })
    expect(dayBlocks[1]).toMatchObject({ startTime: '11:30', endTime: '12:30' })
  })

  it('handles slots across multiple days', () => {
    const slots = [
      makeSlot('2026-03-22T10:00:00'),
      makeSlot('2026-03-23T14:00:00'),
    ]

    const blocks = reconstructBlocks(slots)

    expect(Object.keys(blocks)).toHaveLength(2)
    expect(blocks['2026-03-22']).toHaveLength(1)
    expect(blocks['2026-03-23']).toHaveLength(1)
  })

  it('groups consecutive booked slots together', () => {
    const slots = [
      makeSlot('2026-03-22T10:00:00', { is_booked: true }),
      makeSlot('2026-03-22T10:30:00', { is_booked: true }),
    ]

    const blocks = reconstructBlocks(slots)
    const dayBlocks = blocks['2026-03-22']

    expect(dayBlocks).toHaveLength(1)
    expect(dayBlocks[0].isBooked).toBe(true)
    expect(dayBlocks[0].startTime).toBe('10:00')
    expect(dayBlocks[0].endTime).toBe('11:00')
  })

  // Intentional failure test: verify the test can detect wrong grouping
  it('detects incorrect block count (intentional failure guard)', () => {
    const slots = [
      makeSlot('2026-03-22T10:00:00'),
      makeSlot('2026-03-22T10:30:00', { is_booked: true }),
    ]

    const blocks = reconstructBlocks(slots)
    const dayBlocks = blocks['2026-03-22']

    // This MUST be 2 blocks (different booked status) — not 1
    expect(dayBlocks).not.toHaveLength(1)
    expect(dayBlocks).toHaveLength(2)
  })
})
