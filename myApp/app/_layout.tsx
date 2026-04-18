import { View } from 'react-native'
import { TamaguiProvider } from 'tamagui'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import 'react-native-reanimated'

import tamaguiConfig from '../tamagui.config'
import { SessionProvider } from '@/lib/auth-context'
import { BookingProvider } from '@/lib/booking-context'

const BG = '#FBFBF8'

export const unstable_settings = {
  initialRouteName: '(tabs)',
}

export default function RootLayout() {
  const insets = useSafeAreaInsets()

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Solid bar behind the iOS status bar */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top - 2, backgroundColor: BG, zIndex: 10 }} />
      <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
        <SessionProvider>
          <BookingProvider>
            <Stack screenOptions={{ contentStyle: { backgroundColor: BG } }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="book" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
              <Stack.Screen name="booking" options={{ headerShown: false }} />
            </Stack>
            <StatusBar style="dark" />
          </BookingProvider>
        </SessionProvider>
      </TamaguiProvider>
    </View>
  )
}
