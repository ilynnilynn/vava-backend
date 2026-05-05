// app/(auth)/login.tsx
import { useState, useEffect } from 'react'
import { Alert, Pressable, StyleSheet, View } from 'react-native'
import { Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { GoogleSignin } from '@react-native-google-signin/google-signin'
import * as AppleAuthentication from 'expo-apple-authentication'
import Svg, { Path } from 'react-native-svg'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/auth-context'
import { deriveRoute } from '@/lib/auth-routing'
import { VavaLogo } from '@/components/vava-logo'

function AppleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 384 512">
      <Path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" fill="#FBFBF8" />
    </Svg>
  )
}

function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </Svg>
  )
}

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
})

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { isLoading, session, user, pro } = useSession()

  // Reactive routing — fires once auth state settles after sign-in
  useEffect(() => {
    if (!isLoading && session) {
      const route = deriveRoute(
        true,
        user?.display_name ?? null,
        pro ? pro.is_approved : null
      )
      router.replace(route as never)
    }
  }, [isLoading, session, user, pro])

  async function handleGoogleSignIn() {
    setLoading(true)
    try {
      await GoogleSignin.hasPlayServices()
      const userInfo = await GoogleSignin.signIn()
      const idToken = userInfo.data?.idToken ?? (userInfo as any).idToken

      if (!idToken) {
        Alert.alert('登入失敗', '無法取得 Google 憑證，請再試一次')
        return
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      })

      if (error) Alert.alert('登入失敗', error.message)
    } catch (e: any) {
      // User cancelled
      if (e?.code !== 'SIGN_IN_CANCELLED' && e?.code !== '-5') {
        Alert.alert('登入失敗', e?.message ?? '請稍後再試')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleAppleSignIn() {
    setLoading(true)
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })

      if (!credential.identityToken) {
        Alert.alert('登入失敗', '無法取得 Apple 憑證，請再試一次')
        return
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      })

      if (error) Alert.alert('登入失敗', error.message)
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('登入失敗', e?.message ?? '請稍後再試')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top section: logo + tagline */}
      <View style={styles.top}>
        <VavaLogo size={48} color="#FF5A3C" />
        <Text fontSize={20} fontWeight="700" lineHeight={28} color="#1F2723" marginTop={16}>
          VAVA
        </Text>
        <Text fontSize={15} lineHeight={22} color="#626765" marginTop={8} textAlign="center">
          即時美業預約，隨時出發
        </Text>
      </View>

      {/* Bottom buttons */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          onPress={handleGoogleSignIn}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="以 Google 繼續"
          style={({ pressed }) => [styles.btn, styles.btnGoogle, { opacity: pressed || loading ? 0.75 : 1 }]}
        >
          <GoogleLogo size={20} />
          <Text fontSize={16} fontWeight="600" color="#1F2723">以 Google 繼續</Text>
        </Pressable>

        <Pressable
          onPress={handleAppleSignIn}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="以 Apple 繼續"
          style={({ pressed }) => [styles.btn, styles.btnApple, { opacity: pressed || loading ? 0.75 : 1 }]}
        >
          <AppleLogo size={20} />
          <Text fontSize={16} fontWeight="600" color="#FBFBF8">以 Apple 繼續</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBFBF8', justifyContent: 'space-between' },
  top: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  bottom: { paddingHorizontal: 24, gap: 12 },
  btn: {
    height: 52,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGoogle: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E9E9',
    gap: 8,
  },
  btnApple: {
    backgroundColor: '#000000',
    gap: 8,
  },
})
