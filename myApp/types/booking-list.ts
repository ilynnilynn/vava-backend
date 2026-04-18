import type { BookingStatus } from './database'

export type BookingListItem = {
  id: string
  pro_display_name: string
  service_domain: 'nails' | 'lashes'
  starts_at: string
  status: BookingStatus
}

export type BookingDetail = {
  id: string
  pro_display_name: string
  pro_phone: string | null
  service_domain: 'nails' | 'lashes'
  service_label: string
  starts_at: string
  session_ends_at: string
  studio_address: string
  price_min: number
  price_max: number
  status: BookingStatus
  no_show_window_minutes: number
  customer_late_notified_at: string | null
  created_at: string
}
