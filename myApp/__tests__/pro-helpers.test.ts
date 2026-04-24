// myApp/__tests__/pro-helpers.test.ts
import { getProDisplayStatus, splitProBookings, deriveSlotState } from '../lib/pro-helpers'
import type { ProBookingListItem } from '../types/pro'
import type { BookingStatus } from '../types/database'

// ── getProDisplayStatus ───────────────────────────────────────

describe('getProDisplayStatus', () => {
  const starts = '2026-04-24T14:00:00.000Z'
  const ends   = '2026-04-24T15:30:00.000Z'

  it('returns awaiting when confirmed and before start time', () => {
    const before = new Date('2026-04-24T13:00:00.000Z')
    expect(getProDisplayStatus('confirmed', starts, ends, before)).toBe('awaiting')
  })

  it('returns in_progress when confirmed and during session', () => {
    const during = new Date('2026-04-24T14:30:00.000Z')
    expect(getProDisplayStatus('confirmed', starts, ends, during)).toBe('in_progress')
  })

  it('returns completed when confirmed and after end time', () => {
    const after = new Date('2026-04-24T16:00:00.000Z')
    expect(getProDisplayStatus('confirmed', starts, ends, after)).toBe('completed')
  })

  it('returns completed for completed status regardless of time', () => {
    const before = new Date('2026-04-24T13:00:00.000Z')
    expect(getProDisplayStatus('completed', starts, ends, before)).toBe('completed')
  })

  it('returns no_show for no_show_customer status', () => {
    const during = new Date('2026-04-24T14:30:00.000Z')
    expect(getProDisplayStatus('no_show_customer', starts, ends, during)).toBe('no_show')
  })
})

// ── splitProBookings ──────────────────────────────────────────

describe('splitProBookings', () => {
  const today = new Date('2026-04-24T10:00:00.000Z')

  function makeBooking(
    id: string,
    date: string,
    status: BookingStatus = 'confirmed'
  ): ProBookingListItem {
    return {
      id,
      client_display_name: '陳小姐',
      service_domain: 'nails',
      service_label: '凝膠光療',
      starts_at: `${date}T14:00:00.000Z`,
      ends_at:   `${date}T15:30:00.000Z`,
      status,
    }
  }

  it('puts confirmed today bookings in today', () => {
    const { today: todayBkgs } = splitProBookings(
      [makeBooking('1', '2026-04-24')],
      today
    )
    expect(todayBkgs.map((b) => b.id)).toEqual(['1'])
  })

  it('puts confirmed future bookings in upcoming', () => {
    const { upcoming } = splitProBookings(
      [makeBooking('2', '2026-04-25')],
      today
    )
    expect(upcoming.map((b) => b.id)).toEqual(['2'])
  })

  it('puts completed bookings in past', () => {
    const { past } = splitProBookings(
      [makeBooking('3', '2026-04-24', 'completed')],
      today
    )
    expect(past.map((b) => b.id)).toEqual(['3'])
  })
})

// ── deriveSlotState ───────────────────────────────────────────

describe('deriveSlotState', () => {
  const now = new Date('2026-04-24T12:00:00.000Z')
  const pastSlot   = '2026-04-24T10:00:00.000Z'
  const futureSlot = '2026-04-24T14:00:00.000Z'

  it('returns expired for past slots', () => {
    expect(deriveSlotState(pastSlot, false, false, now)).toBe('expired')
  })

  it('returns booked for booked future slots', () => {
    expect(deriveSlotState(futureSlot, true, true, now)).toBe('booked')
  })

  it('returns open for open future slots', () => {
    expect(deriveSlotState(futureSlot, true, false, now)).toBe('open')
  })

  it('returns available for future slots not yet opened', () => {
    expect(deriveSlotState(futureSlot, false, false, now)).toBe('available')
  })
})

// ── isToday ──────────────────────────────────────────────────

describe('isToday', () => {
  function isToday(isoString: string, now = new Date()): boolean {
    return isoString.slice(0, 10) === now.toISOString().slice(0, 10)
  }

  it('returns true for an ISO string on the same date as now', () => {
    const now = new Date('2026-04-25T09:00:00.000Z')
    expect(isToday('2026-04-25T14:00:00.000Z', now)).toBe(true)
  })

  it('returns false for a different date', () => {
    const now = new Date('2026-04-25T09:00:00.000Z')
    expect(isToday('2026-04-26T14:00:00.000Z', now)).toBe(false)
  })
})

// ── isThisWeek ───────────────────────────────────────────────

describe('isThisWeek', () => {
  function isThisWeek(isoString: string, now = new Date()): boolean {
    const date = new Date(isoString)
    const startOfWeek = new Date(now)
    startOfWeek.setHours(0, 0, 0, 0)
    startOfWeek.setDate(now.getDate() - now.getDay())
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 7)
    return date >= startOfWeek && date < endOfWeek
  }

  it('returns true for a date within the same week', () => {
    // 2026-04-25 is a Saturday (day 6). Week starts Sunday 2026-04-20.
    const now = new Date('2026-04-25T09:00:00')
    expect(isThisWeek('2026-04-22T10:00:00', now)).toBe(true)
  })

  it('returns false for a date in the next week', () => {
    const now = new Date('2026-04-25T09:00:00')
    expect(isThisWeek('2026-04-27T10:00:00', now)).toBe(false)
  })

  it('returns false for a date in the previous week', () => {
    // In GMT+8, '2026-04-25T09:00:00' is Saturday Apr 25 (day 6),
    // so startOfWeek is Sunday Apr 19 00:00 local. Apr 18 is before that.
    const now = new Date('2026-04-25T09:00:00')
    expect(isThisWeek('2026-04-18T10:00:00', now)).toBe(false)
  })
})

// ── getNudgeState ─────────────────────────────────────────────

describe('getNudgeState', () => {
  type NudgeState = 'none_open' | 'open_no_bookings' | 'open_with_bookings'
  function getNudgeState(openCount: number, bookedCount: number): NudgeState {
    if (openCount === 0) return 'none_open'
    if (bookedCount === 0) return 'open_no_bookings'
    return 'open_with_bookings'
  }

  it('returns none_open when openCount is 0', () => {
    expect(getNudgeState(0, 0)).toBe('none_open')
    expect(getNudgeState(0, 3)).toBe('none_open')
  })

  it('returns open_no_bookings when slots are open but none booked', () => {
    expect(getNudgeState(5, 0)).toBe('open_no_bookings')
  })

  it('returns open_with_bookings when slots are open and some booked', () => {
    expect(getNudgeState(3, 2)).toBe('open_with_bookings')
  })
})
