// ============================================================
// OVERLAP — booking time overlap detection
//
// Used server-side (confirm route) and client-side (pre-filter).
// ============================================================

type TimeRange = {
  starts_at: string   // ISO timestamp
  session_ends_at: string // ISO timestamp
}

/**
 * Returns true if the proposed booking overlaps with any existing booking.
 * Two ranges overlap when: startA < endB AND startB < endA
 */
export function hasTimeOverlap(
  existingBookings: TimeRange[],
  newStartsAt: string,
  newSessionEndsAt: string
): boolean {
  const newStart = new Date(newStartsAt).getTime()
  const newEnd = new Date(newSessionEndsAt).getTime()

  return existingBookings.some((b) => {
    const existStart = new Date(b.starts_at).getTime()
    const existEnd = new Date(b.session_ends_at).getTime()
    return newStart < existEnd && existStart < newEnd
  })
}
