// app/index.tsx
// Auth gate. Shows coral splash while session loads, then redirects.
import { useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useSession } from '@/lib/auth-context'
import { deriveRoute } from '@/lib/auth-routing'
import { VavaLogo } from '@/components/vava-logo'

export default function IndexScreen() {
  const router = useRouter()
  const { isLoading, session, user, pro } = useSession()

  useEffect(() => {
    console.log('[index] state - isLoading:', isLoading, 'hasSession:', !!session, 'user:', user?.display_name ?? 'none')
    if (isLoading) return
    const route = deriveRoute(
      !!session,
      user?.display_name ?? null,
      pro ? pro.is_approved : null
    )
    console.log('[index] routing to:', route)
    router.replace(route as never)
  }, [isLoading, session, user, pro])

  return (
    <View style={styles.container}>
      <VavaLogo size={56} color="rgba(255,255,255,0.9)" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF5A3C',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
