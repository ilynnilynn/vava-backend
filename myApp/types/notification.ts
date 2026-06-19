export type NotificationType =
  | 'booking_confirmed'
  | 'booking_changed'
  | 'booking_cancelled'
  | 'booking_reminder'
  | 'review_prompt'
  | 'pro_application_declined'

export type NotificationListItem = {
  id: string
  type: NotificationType
  title: string
  body: string
  created_at: string // ISO
  is_read: boolean
  booking_id?: string // present on all booking-related notifications
}
