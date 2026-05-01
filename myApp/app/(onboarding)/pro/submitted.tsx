// app/(onboarding)/pro/submitted.tsx
import { useEffect } from 'react'
import { Alert, StyleSheet, View } from 'react-native'
import { Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/auth-context'
import { VavaLogo } from '@/components/vava-logo'

const DRAFT_KEY = '@vava/proWizardDraft'

export default function ProSubmittedScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { session } = useSession()

  useEffect(() => {
    submitIfDraftExists()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(pro-tabs)/account' as never)
    }, 3000)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function submitIfDraftExists() {
    const raw = await AsyncStorage.getItem(DRAFT_KEY)
    if (!raw || !session) {
      return
    }

    const draft = JSON.parse(raw)

    if (!draft.display_name || !draft.domains?.length || !draft.studio_address) {
      Alert.alert('資料不完整', '請重新填寫申請資料', [
        { text: '返回', onPress: () => router.back() },
      ])
      return
    }

    const { error } = await supabase.from('pros').upsert({
      user_id: session.user.id,
      display_name: draft.display_name,
      domains: draft.domains,
      nail_scope: draft.nail_scope ?? [],
      studio_district: draft.studio_district ?? '',
      studio_address: draft.studio_address,
      ig_handle: draft.ig_handle ?? null,
      id_photo_path: draft.id_photo_path ?? null,
      is_approved: false,
      submitted_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (error) {
      Alert.alert('申請失敗', error.message)
      return
    }

    await AsyncStorage.removeItem(DRAFT_KEY)
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.content}>
        <VavaLogo size={48} color="#FF5A3C" />
        <Text fontSize={24} fontWeight="700" lineHeight={32} color="#1F2723" marginTop={24} textAlign="center">
          申請已送出
        </Text>
        <Text fontSize={16} lineHeight={24} color="#626765" marginTop={12} textAlign="center">
          我們將在 1–2 個工作天內審核你的申請，通過後會通知你。
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBFBF8' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
})
