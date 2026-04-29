import { useEffect } from 'react'
import { View, Linking } from 'react-native'
import { TamaguiProvider } from 'tamagui'
import { Stack, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import * as Notifications from 'expo-notifications'
import 'react-native-reanimated'

SplashScreen.preventAutoHideAsync()

import tamaguiConfig from '../tamagui.config'
import { SessionProvider } from '@/lib/auth-context'
import { BookingProvider } from '@/lib/booking-context'
import { RoleProvider } from '@/lib/role-context'
import { supabase } from '@/lib/supabase'
import { PersistentTabBar } from '@/components/persistent-tab-bar'
import '@/lib/push-notifications' // registers setNotificationHandler side-effect
import { savePushToken } from '@/lib/push-notifications'

const BG = '#FBFBF8'

export const unstable_settings = {
  initialRouteName: 'index',
}

// Route the user to the correct screen from a notification tap.
function routeFromNotification(
  response: Notifications.NotificationResponse,
  router: ReturnType<typeof useRouter>
) {
  const data = response.notification.request.content.data as Record<string, string> | undefined
  if (data?.booking_id) {
    router.push(`/booking/${data.booking_id}` as never)
  }
}

// Resolve a deep-link URL to an internal expo-router path.
// Scheme: myapp://booking/:id  →  /booking/:id
function resolveDeepLink(url: string): string | null {
  try {
    const { hostname, pathname } = new URL(url)
    // myapp://booking/abc123  →  hostname='booking', pathname='/abc123'
    if (hostname === 'booking' && pathname.length > 1) {
      return `/booking${pathname}`
    }
    // myapp://notifications
    if (hostname === 'notifications') return '/notifications'
  } catch {}
  return null
}

export default function RootLayout() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  // Handle deep links that open the app (cold start or background tap)
  useEffect(() => {
    // Cold-start URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        const path = resolveDeepLink(url)
        if (path) router.push(path as never)
      }
    })

    // Foreground URL events
    const sub = Linking.addEventListener('url', ({ url }) => {
      const path = resolveDeepLink(url)
      if (path) router.push(path as never)
    })

    return () => sub.remove()
  }, [router])

  // Save Expo push token whenever the user signs in
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') savePushToken()
    })
    return () => subscription.unsubscribe()
  }, [])

  // Handle notification taps — route to booking detail via data payload
  useEffect(() => {
    // App was opened from a killed state by tapping a notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) routeFromNotification(response, router)
    })

    // Notification tapped while app is running (foreground/background)
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      routeFromNotification(response, router)
    })

    return () => sub.remove()
  }, [router])

  const [fontsLoaded] = useFonts({
    'FA6Pro-Solid':   require('../assets/fonts/FA6Pro-Solid.otf'),
    'FA6Pro-Regular': require('../assets/fonts/FA6Pro-Regular.otf'),
  })

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync()
  }, [fontsLoaded])

  if (!fontsLoaded) return null

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Solid bar behind the iOS status bar */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top - 2, backgroundColor: BG, zIndex: 10 }} />
      <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
        <SessionProvider>
          <RoleProvider>
            <BookingProvider>
              <Stack screenOptions={{ contentStyle: { backgroundColor: BG } }}>
                <Stack.Screen name="index" options={{ headerShown: false, animation: 'none' }} />
                <Stack.Screen name="(auth)" options={{ headerShown: false, animation: 'none', gestureEnabled: false }} />
                <Stack.Screen name="(onboarding)" options={{ headerShown: false, animation: 'none', gestureEnabled: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none', gestureEnabled: false }} />
                <Stack.Screen name="(pro-tabs)" options={{ headerShown: false, animation: 'none', gestureEnabled: false }} />
                <Stack.Screen name="pro" options={{ headerShown: false }} />
                <Stack.Screen name="book" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
                <Stack.Screen name="booking" options={{ headerShown: false }} />
                <Stack.Screen name="account" options={{ headerShown: false }} />
                <Stack.Screen name="notifications" options={{ headerShown: false }} />
              </Stack>
              {/* Persistent tab bar — sits above all Stack screens, below system modals */}
              <PersistentTabBar />
              <StatusBar style="dark" />
            </BookingProvider>
          </RoleProvider>
        </SessionProvider>
      </TamaguiProvider>
    </View>
  )
}
