// app/(auth)/login.tsx
import { useState } from 'react'
import { Alert, Pressable, StyleSheet, View } from 'react-native'
import { Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from '@/lib/supabase'
import { VavaLogo } from '@/components/vava-logo'

// After OAuth redirect, Supabase auth state change fires and index.tsx re-routes.

async function signInWith(provider: 'google' | 'apple') {
  const redirectTo = 'myapp://auth-callback'

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  })

  if (error || !data.url) {
    Alert.alert('登入失敗', error?.message ?? '請稍後再試')
    return
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)

  if (result.type === 'success') {
    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(result.url)
    if (sessionError) {
      Alert.alert('登入失敗', sessionError.message)
    }
    // Auth state change fires → index.tsx will redirect to correct screen
  }
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const [loading, setLoading] = useState(false)

  async function handleSignIn(provider: 'google' | 'apple') {
    setLoading(true)
    await signInWith(provider)
    setLoading(false)
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

      {/* Bottom buttons — text-only labels, no brand icons needed */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          onPress={() => handleSignIn('google')}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="以 Google 繼續"
          style={({ pressed }) => [styles.btn, styles.btnGoogle, { opacity: pressed || loading ? 0.75 : 1 }]}
        >
          <Text fontSize={16} fontWeight="600" color="#1F2723">以 Google 繼續</Text>
        </Pressable>

        <Pressable
          onPress={() => handleSignIn('apple')}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="以 Apple 繼續"
          style={({ pressed }) => [styles.btn, styles.btnApple, { opacity: pressed || loading ? 0.75 : 1 }]}
        >
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
  },
  btnApple: {
    backgroundColor: '#1F2723',
  },
})
