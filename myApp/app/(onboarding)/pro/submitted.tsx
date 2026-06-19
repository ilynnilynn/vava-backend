// app/(onboarding)/pro/submitted.tsx
import { useState, useEffect } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import { Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/auth-context'
import { VavaLogo } from '@/components/vava-logo'

const DRAFT_KEY = '@vava/proWizardDraft'

type Status = 'submitting' | 'success' | 'error' | 'pending'

export default function ProSubmittedScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { session, proStatus, refreshUser } = useSession()

  const [status, setStatus] = useState<Status>('submitting')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  async function submit() {
    setStatus('submitting')
    setErrorMessage(null)

    const raw = await AsyncStorage.getItem(DRAFT_KEY)
    if (!raw || !session) {
      setStatus('error')
      setErrorMessage('找不到申請資料，請重新填寫')
      return
    }

    const draft = JSON.parse(raw)

    const missing: string[] = []
    if (!draft.display_name)     missing.push('顯示名稱')
    if (!draft.ig_handle)        missing.push('Instagram')
    if (!draft.line_id)          missing.push('LINE ID')
    if (!draft.studio_address)   missing.push('工作室地址')
    if (!draft.domains?.length)  missing.push('服務類型')
    if (!draft.id_photo_path)    missing.push('身份證件照片')

    if (missing.length > 0) {
      setStatus('error')
      setErrorMessage(`以下欄位未填寫，請返回補填：${missing.join('、')}`)
      return
    }

    console.log(`[QA:Submit] id_photo_path=${draft.id_photo_path}`)

    const { error } = await supabase.from('pros').upsert({
      user_id: session.user.id,
      display_name: draft.display_name,
      phone: draft.phone ?? null,
      ig_handle: draft.ig_handle,
      line_id: draft.line_id,
      ig_verification_status: draft.ig_verification_status ?? 'pending_review',
      domains: draft.domains,
      studio_district: draft.studio_district ?? '',
      studio_address: draft.studio_address,
      id_photo_path: draft.id_photo_path ?? null,
      is_approved: false,
      submitted_at: new Date().toISOString(),
      verification_status: 'pending',
      rejection_reasons: null,
      rejection_note: null,
      reviewed_at: null,
    }, { onConflict: 'user_id' })

    if (error) {
      setStatus('error')
      setErrorMessage(error.message)
      return
    }

    await AsyncStorage.removeItem(DRAFT_KEY)
    // Refresh auth context so proStatus updates from 'none' → 'pending'
    await refreshUser()
    setStatus('success')
    // Brief success display before navigating — upsert is already committed at this point
    setTimeout(() => {
      router.replace('/(tabs)/account' as never)
    }, 1500)
  }

  // Phase 1: refresh pro status on mount to get latest from DB
  useEffect(() => {
    refreshUser().then(() => setInitialized(true))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Phase 2: act on fresh proStatus after refresh completes
  useEffect(() => {
    if (!initialized) return

    async function decide() {
      const hasDraft = !!(await AsyncStorage.getItem(DRAFT_KEY))
      const destination =
        hasDraft ? 'submit' :
        proStatus === 'pending' ? 'pending-screen' :
        proStatus === 'rejected' ? 'domains' : 'submit'

      console.log(`[QA:ProRouting] derivedStatus=${proStatus} hasDraft=${hasDraft} destination=${destination}`)

      // User completed onboarding and has draft data → always submit
      if (hasDraft) { submit(); return }
      // No draft: user arrived from account tab — route based on status
      if (proStatus === 'pending') { setStatus('pending'); return }
      if (proStatus === 'rejected') {
        router.replace('/(onboarding)/pro/domains' as never)
        return
      }
      // proStatus === 'none' with no draft — shouldn't happen, show error
      setStatus('error')
      setErrorMessage('找不到申請資料，請重新填寫')
    }

    decide()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, proStatus])

  const pad = { paddingTop: insets.top, paddingBottom: insets.bottom + 32 }

  if (status === 'submitting') {
    return (
      <View style={[styles.container, pad]}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#FF5A3C" />
          <Text fontSize={16} color="#8F9391" marginTop={20} textAlign="center">
            提交中...
          </Text>
        </View>
      </View>
    )
  }

  if (status === 'error') {
    return (
      <View style={[styles.container, pad]}>
        <View style={styles.content}>
          <Text fontSize={20} fontWeight="700" color="#1F2723" textAlign="center">
            申請失敗
          </Text>
          <Text fontSize={14} color="#8F9391" marginTop={12} textAlign="center">
            {errorMessage}
          </Text>
          <Pressable onPress={submit} style={styles.retryButton}>
            <Text fontSize={15} fontWeight="600" color="#FBFBF8">
              重試
            </Text>
          </Pressable>
          <Pressable onPress={() => router.replace('/(tabs)/account' as never)} style={styles.backButton}>
            <Text fontSize={15} fontWeight="600" color="#1F2723">
              返回帳號
            </Text>
          </Pressable>
        </View>
      </View>
    )
  }

  if (status === 'pending') {
    return (
      <View style={[styles.container, pad]}>
        <View style={styles.content}>
          <VavaLogo size={48} color="#FF5A3C" />
          <Text fontSize={24} fontWeight="700" lineHeight={32} color="#1F2723" marginTop={24} textAlign="center">
            審核中
          </Text>
          <Text fontSize={16} lineHeight={24} color="#8F9391" marginTop={12} textAlign="center">
            我們將在 1–2 個工作天內審核你的申請
          </Text>
          <Pressable onPress={() => router.replace('/(tabs)/account' as never)} style={styles.primaryButton}>
            <Text fontSize={15} fontWeight="600" color="#FBFBF8">
              返回帳號
            </Text>
          </Pressable>
        </View>
      </View>
    )
  }

  // status === 'success'
  return (
    <View style={[styles.container, pad]}>
      <View style={styles.content}>
        <VavaLogo size={48} color="#FF5A3C" />
        <Text fontSize={24} fontWeight="700" lineHeight={32} color="#1F2723" marginTop={24} textAlign="center">
          申請已送出
        </Text>
        <Text fontSize={16} lineHeight={24} color="#8F9391" marginTop={12} textAlign="center">
          我們將在 1–2 個工作天內審核你的申請，通過後會通知你。
        </Text>
        <Pressable onPress={() => router.replace('/(tabs)/account' as never)} style={styles.backButton}>
          <Text fontSize={15} fontWeight="600" color="#1F2723">
            返回帳號
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBFBF8' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  retryButton: {
    marginTop: 28,
    backgroundColor: '#1F2723',
    borderRadius: 9999,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  backButton: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  primaryButton: {
    marginTop: 28,
    backgroundColor: '#1F2723',
    borderRadius: 9999,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
})
