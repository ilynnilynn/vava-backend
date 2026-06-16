// app/index.tsx
// Auth gate. Shows coral splash while session loads, then redirects.
// First-time users see the welcome value carousel before login.
import { useEffect, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSession } from '@/lib/auth-context'
import { deriveRoute } from '@/lib/auth-routing'
import { VavaLogo } from '@/components/vava-logo'

const WELCOME_SEEN_KEY = '@vava/hasSeenWelcome'

export default function IndexScreen() {
  const router = useRouter()
  const { isLoading, session, user, pro } = useSession()
  const [welcomeChecked, setWelcomeChecked] = useState(false)
  const [hasSeenWelcome, setHasSeenWelcome] = useState(true)

  // Check if user has seen welcome carousel
  useEffect(() => {
    AsyncStorage.getItem(WELCOME_SEEN_KEY).then((val) => {
      setHasSeenWelcome(val === 'true')
      setWelcomeChecked(true)
    })
  }, [])

  useEffect(() => {
    if (isLoading || !welcomeChecked) return
    const route = deriveRoute(
      !!session,
      user,
      pro ? pro.is_approved : null,
      hasSeenWelcome
    )
    router.replace(route as never)
  }, [isLoading, session, user, pro, welcomeChecked, hasSeenWelcome])

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
