// myApp/types/pro.ts
import type { BookingStatus } from './database'

export type ProDisplayStatus = 'awaiting' | 'in_progress' | 'completed' | 'no_show'

export type ProBookingListItem = {
  id: string
  client_display_name: string
  service_domain: 'nails' | 'lashes'
  service_label: string
  starts_at: string   // ISO
  ends_at: string     // ISO
  status: BookingStatus
}

export type SlotState = 'expired' | 'available' | 'open' | 'booked'

export type SlotItem = {
  starts_at: string   // ISO, 15-min boundary
  state: SlotState
}

export type ServiceItem = {
  id: string
  name: string
  duration_minutes: number
  price: number
}
