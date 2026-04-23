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
