// ============================================================
// NOTIFICATIONS — in-app + Expo push
//
// All notifications go through this file.
// Two channels: in-app (Supabase notifications table) and
// Expo push (device push via Expo Push API).
//
// No LINE integration — all notifications are local.
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin'

// ── In-app notifications ───────────────────────────────────────

export async function createInAppNotification(params: {
  userId: string
  type: string
  title: string
  body: string
  bookingId?: string | null
}): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from('notifications').insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    booking_id: params.bookingId ?? null,
  })
  if (error) {
    console.error('[notifications] Failed to create in-app notification:', error)
  }
}

// ── Expo Push Notifications ──────────────────────────────────

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

type ExpoPushMessage = {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
  sound?: 'default' | null
  badge?: number
}

// Send a push notification via Expo Push API.
// pushToken = Expo push token (ExponentPushToken[xxx]) stored in users.push_token_expo
export async function sendPushNotification(params: {
  pushToken: string
  title: string
  body: string
  data?: Record<string, unknown>
}): Promise<void> {
  if (!params.pushToken) return

  const message: ExpoPushMessage = {
    to: params.pushToken,
    title: params.title,
    body: params.body,
    data: params.data,
    sound: 'default',
  }

  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify(message),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('[notifications] Expo push error:', res.status, body)
  }
}

// Batch send push notifications (Expo supports up to 100 per request)
export async function sendPushNotificationBatch(
  messages: ExpoPushMessage[]
): Promise<void> {
  if (!messages.length) return

  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify(messages),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('[notifications] Expo push batch error:', res.status, body)
  }
}

// ── Unified notify helper ────────────────────────────────────

// Sends both in-app + push for a user. Best-effort on both channels.
export async function notify(params: {
  userId: string
  pushToken?: string | null
  type: string
  title: string
  body: string
  bookingId?: string | null
  data?: Record<string, unknown>
}): Promise<void> {
  // In-app (always)
  await createInAppNotification({
    userId: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    bookingId: params.bookingId,
  })

  // Push (if token available)
  if (params.pushToken) {
    await sendPushNotification({
      pushToken: params.pushToken,
      title: params.title,
      body: params.body,
      data: {
        type: params.type,
        bookingId: params.bookingId,
        ...params.data,
      },
    }).catch(err => {
      console.error('[notifications] push failed:', err)
    })
  }
}

// ── Notification logging ─────────────────────────────────────

export async function logNotificationSend(params: {
  userId: string
  channel: 'push' | 'in_app'
  type: string
  bookingId?: string | null
  success: boolean
  errorMessage?: string | null
}): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from('notification_logs').insert({
    user_id: params.userId,
    channel: params.channel,
    type: params.type,
    booking_id: params.bookingId ?? null,
    success: params.success,
    error_message: params.errorMessage ?? null,
  })
  if (error) {
    console.error('[notifications] Failed to log notification:', error)
  }
}
