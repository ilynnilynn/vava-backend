// lib/push-notifications.ts
// Handles iOS push notification registration, permission checks, and local test scheduling.

import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { supabase } from './supabase'

const PROJECT_ID = Constants.expoConfig?.extra?.eas?.projectId as string | undefined

// Show alerts/sound/badge while app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export type PushPermissionStatus = 'granted' | 'denied' | 'undetermined'

export async function getPushPermissionStatus(): Promise<PushPermissionStatus> {
  if (!Device.isDevice) return 'denied' // simulators can't receive push
  const { status } = await Notifications.getPermissionsAsync()
  return status as PushPermissionStatus
}

export async function requestPushPermission(): Promise<PushPermissionStatus> {
  if (!Device.isDevice) return 'denied'
  const { status } = await Notifications.requestPermissionsAsync()
  return status as PushPermissionStatus
}

// Returns the Expo push token for this device, or null if not available.
// Save this to Supabase (users.push_token) once auth is wired.
export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice || Platform.OS !== 'ios') return null
  const { status } = await Notifications.getPermissionsAsync()
  if (status !== 'granted') return null
  try {
    const token = await Notifications.getExpoPushTokenAsync(
      PROJECT_ID ? { projectId: PROJECT_ID } : undefined,
    )
    return token.data
  } catch {
    return null
  }
}

// Fetches the Expo push token and saves it to users.push_token_expo.
// Call this after the user logs in and has granted push permission.
export async function savePushToken(): Promise<void> {
  const token = await getExpoPushToken()
  if (!token) return

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  await supabase
    .from('users')
    .update({ push_token_expo: token })
    .eq('id', session.user.id)
}

// Schedules a local notification — no APNs/server required.
// Used by the test button in 通知設定.
export async function scheduleTestNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '預約已確認',
      body: 'Mia 已確認您 4/28 14:00 的美甲預約',
      data: { booking_id: 'booking-mock-1', type: 'booking_confirmed' },
      sound: true,
    },
    trigger: null, // deliver immediately
  })
}
