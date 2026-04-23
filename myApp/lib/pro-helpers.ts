// myApp/lib/pro-helpers.ts
import type { BookingStatus } from '@/types/database'
import type { ProDisplayStatus, ProBookingListItem, SlotState } from '@/types/pro'

/**
 * Derives the display status for a Pro booking card.
 * 'confirmed' bookings show different states depending on the current time.
 */
export function getProDisplayStatus(
  status: BookingStatus,
  startsAt: string,
  endsAt: string,
  now: Date = new Date()
): ProDisplayStatus {
  if (status === 'completed') return 'completed'
  if (status === 'no_show_customer') return 'no_show'
  if (status !== 'confirmed') return 'awaiting'

  const start = new Date(startsAt)
  const end = new Date(endsAt)

  if (now < start) return 'awaiting'
  if (now >= start && now <= end) return 'in_progress'
  return 'completed'
}

/**
 * Splits a pro's bookings into three groups:
 * - today: confirmed bookings for today (shown on Home)
 * - upcoming: confirmed bookings from tomorrow onwards
 * - past: completed / no-show bookings
 */
export function splitProBookings(bookings: ProBookingListItem[], now: Date = new Date()) {
  const todayStr = now.toISOString().slice(0, 10)
  const today: ProBookingListItem[] = []
  const upcoming: ProBookingListItem[] = []
  const past: ProBookingListItem[] = []

  for (const b of bookings) {
    const bookingDate = b.starts_at.slice(0, 10)
    const isActive = b.status === 'confirmed'

    if (!isActive) {
      past.push(b)
    } else if (bookingDate === todayStr) {
      today.push(b)
    } else if (bookingDate > todayStr) {
      upcoming.push(b)
    } else {
      past.push(b)
    }
  }

  today.sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  upcoming.sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  past.sort((a, b) => b.starts_at.localeCompare(a.starts_at))

  return { today, upcoming, past }
}

/**
 * Derives slot display state from raw slot data.
 */
export function deriveSlotState(
  startsAt: string,
  isOpen: boolean,
  isBooked: boolean,
  now: Date = new Date()
): SlotState {
  if (new Date(startsAt) < now) return 'expired'
  if (isBooked) return 'booked'
  if (isOpen) return 'open'
  return 'available'
}
