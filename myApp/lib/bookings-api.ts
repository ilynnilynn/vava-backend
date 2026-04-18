import { apiPost } from './api'
import type { BookingListItem, BookingDetail } from '@/types/booking-list'

// ── Mock data (remove when backend endpoints exist) ─────────

const now = new Date()
const tomorrow = new Date(now)
tomorrow.setDate(tomorrow.getDate() + 1)
const yesterday = new Date(now)
yesterday.setDate(yesterday.getDate() - 1)
const lastWeek = new Date(now)
lastWeek.setDate(lastWeek.getDate() - 7)

const MOCK_BOOKINGS: BookingListItem[] = [
  {
    id: 'mock-1',
    pro_display_name: 'Mia',
    service_domain: 'nails',
    starts_at: tomorrow.toISOString(),
    status: 'confirmed',
  },
  {
    id: 'mock-2',
    pro_display_name: 'Yuki',
    service_domain: 'lashes',
    starts_at: yesterday.toISOString(),
    status: 'completed',
  },
  {
    id: 'mock-3',
    pro_display_name: 'Hana',
    service_domain: 'nails',
    starts_at: lastWeek.toISOString(),
    status: 'cancelled_customer',
  },
]

const MOCK_DETAIL: BookingDetail = {
  id: 'mock-1',
  pro_display_name: 'Mia',
  pro_phone: null,
  service_domain: 'nails',
  service_label: '凝膠・單色',
  starts_at: tomorrow.toISOString(),
  session_ends_at: new Date(tomorrow.getTime() + 90 * 60 * 1000).toISOString(),
  studio_address: '台北市大安區忠孝東路四段100號',
  price_min: 800,
  price_max: 1200,
  status: 'confirmed',
  no_show_window_minutes: 15,
  customer_late_notified_at: null,
  created_at: now.toISOString(),
}

// ── API functions ───────────────────────────────────────────

const USE_MOCK = true // flip to false when backend is ready

export async function fetchBookings(): Promise<BookingListItem[]> {
  if (USE_MOCK) return MOCK_BOOKINGS
  return apiPost<BookingListItem[]>('/api/bookings/list', {})
}

export async function fetchBookingDetail(bookingId: string): Promise<BookingDetail> {
  if (USE_MOCK) {
    const found = MOCK_BOOKINGS.find((b) => b.id === bookingId)
    return {
      ...MOCK_DETAIL,
      id: bookingId,
      pro_display_name: found?.pro_display_name ?? MOCK_DETAIL.pro_display_name,
      status: found?.status ?? MOCK_DETAIL.status,
      starts_at: found?.starts_at ?? MOCK_DETAIL.starts_at,
      service_domain: found?.service_domain ?? MOCK_DETAIL.service_domain,
    }
  }
  return apiPost<BookingDetail>('/api/bookings/detail', { bookingId })
}
