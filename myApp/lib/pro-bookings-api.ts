// myApp/lib/pro-bookings-api.ts
import type { ProBookingListItem } from '@/types/pro'

const USE_MOCK = true

// ── Mock data ──────────────────────────────────────────────────
const now = new Date()

function isoAt(hour: number, minute: number, offsetDays = 0): string {
  const d = new Date(now)
  d.setDate(d.getDate() + offsetDays)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

const MOCK_PRO_BOOKINGS: ProBookingListItem[] = [
  {
    id: 'pb-1',
    client_display_name: '陳小姐',
    service_domain: 'nails',
    service_label: '凝膠光療 · 手部',
    starts_at: isoAt(14, 0),
    ends_at: isoAt(15, 30),
    status: 'confirmed',
  },
  {
    id: 'pb-2',
    client_display_name: '王先生',
    service_domain: 'lashes',
    service_label: '捲翹嫁接 · 自然款',
    starts_at: isoAt(16, 0),
    ends_at: isoAt(17, 0),
    status: 'confirmed',
  },
  {
    id: 'pb-3',
    client_display_name: '林小姐',
    service_domain: 'nails',
    service_label: '法式漸層',
    starts_at: isoAt(10, 0, 1),
    ends_at: isoAt(11, 30, 1),
    status: 'confirmed',
  },
  {
    id: 'pb-4',
    client_display_name: '張小姐',
    service_domain: 'lashes',
    service_label: '極致濃密款',
    starts_at: isoAt(14, 0, -1),
    ends_at: isoAt(15, 30, -1),
    status: 'completed',
  },
]

// ── API ────────────────────────────────────────────────────────

export async function fetchProBookings(): Promise<ProBookingListItem[]> {
  if (USE_MOCK) return MOCK_PRO_BOOKINGS
  // TODO: replace with real Supabase query when backend ready
  return []
}

export async function markBookingComplete(bookingId: string): Promise<void> {
  if (USE_MOCK) {
    const b = MOCK_PRO_BOOKINGS.find((x) => x.id === bookingId)
    if (b) b.status = 'completed'
    return
  }
  // TODO: PATCH /api/pro/bookings/:id/complete
}

export async function markBookingNoShow(bookingId: string): Promise<void> {
  if (USE_MOCK) {
    const b = MOCK_PRO_BOOKINGS.find((x) => x.id === bookingId)
    if (b) b.status = 'no_show_customer'
    return
  }
  // TODO: PATCH /api/pro/bookings/:id/no-show
}
