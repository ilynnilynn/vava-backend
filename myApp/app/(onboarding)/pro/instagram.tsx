// app/(onboarding)/pro/instagram.tsx
// ⚠️  DO NOT change the Instagram verification endpoint or approach.
//     LOCKED: www.instagram.com/api/v1/users/web_profile_info/ + X-IG-App-ID: 936619743392459
//     - i.instagram.com returns 401 (requires auth session)
//     - HTML scraping is unreliable (Instagram uses client-side rendering)
//     - This endpoint returns real JSON (is_private, 404 for non-existent)
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native'
import { Text } from 'tamagui'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'
import { checkInstagramHandle, type VerifyState } from '@/lib/instagram-verify'

const DRAFT_KEY = '@vava/proWizardDraft'

type CheckState = 'idle' | 'checking' | VerifyState

// Blocking errors — user must correct before continuing
const ERROR_MESSAGES: Partial<Record<CheckState, string>> = {
  private: '此帳號目前為私人帳號，請改為公開後再試',
  not_found: '找不到這個 Instagram 帳號，請確認帳號名稱是否正確',
  invalid_format: '請輸入有效的 Instagram 帳號',
}

// Pending review — technical/API failure, user is not blocked
const PENDING_REVIEW_MESSAGE = '我們會稍後確認你的 Instagram 帳號'

export default function ProInstagramScreen() {
  const router = useRouter()
  const [handle, setHandle] = useState('')
  const [checkState, setCheckState] = useState<CheckState>('idle')

  // Race-condition guards:
  // - abortRef cancels the in-flight HTTP request when a new one starts
  // - reqIdRef is a defense-in-depth version counter; result is discarded
  //   if it belongs to an older request (e.g. abort raced with fetch resolve)
  const abortRef = useRef<AbortController | null>(null)
  const reqIdRef = useRef(0)

  // Cancel any in-flight request on unmount
  useEffect(() => () => { abortRef.current?.abort() }, [])

  // Strip whitespace and @ prefix for the actual handle
  const trimmedHandle = handle.replace(/\s/g, '').replace(/^@/, '')
  const hasHandle = trimmedHandle.length > 0
  const verified = checkState === 'verified'

  function onHandleChange(t: string) {
    setHandle(t.replace(/\s/g, ''))
    if (checkState !== 'idle') {
      abortRef.current?.abort() // kill request for the handle they just changed
      setCheckState('idle')
    }
  }

  async function verifyAccount() {
    if (!trimmedHandle) return

    // Cancel previous request and stamp a new ID before going async
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const reqId = ++reqIdRef.current

    setCheckState('checking')
    try {
      const result = await checkInstagramHandle(trimmedHandle, fetch, controller.signal)
      // Discard result if a newer request has already started
      if (reqId !== reqIdRef.current) return
      console.log('[IG verify] handle:', trimmedHandle, '→', result)
      setCheckState(result)
    } catch {
      // AbortError from cancellation — discard silently, state already reset
    }
  }

  async function saveAndNext() {
    const raw = await AsyncStorage.getItem(DRAFT_KEY)
    const current = raw ? JSON.parse(raw) : {}
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({
      ...current,
      ig_handle: trimmedHandle,
      ig_verification_status: verified ? 'verified' : 'pending_review',
    }))
    router.push('/(onboarding)/pro/id-photo' as never)
  }

  function handleSkip() {
    router.push('/(onboarding)/pro/id-photo' as never)
  }

  const errorMessage = ERROR_MESSAGES[checkState] ?? null
  // User-caused errors: re-verify same handle makes sense (e.g. just made account public)
  const isUserError = checkState === 'not_found' || checkState === 'private'
  // Technical failures (network/rate-limit) → pending review, user is not blocked
  const isPendingReview = checkState === 'network_error' || checkState === 'rate_limit'

  return (
    <OnboardingStepLayout
      title="連結 Instagram 工作帳號"
      subtitle="請提供公開帳號供客人查看作品"
      step={6}
      totalSteps={7}
      onNext={saveAndNext}
      nextDisabled={!verified && !isPendingReview}
      onSkip={handleSkip}
    >
      {/* Handle input — no border, large text to match other screens */}
      <View style={styles.inputRow}>
        <Text style={styles.atSign}>@</Text>
        <TextInput
          value={handle}
          onChangeText={onHandleChange}
          placeholder="your_account"
          placeholderTextColor="#AEADA6"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          style={styles.input}
        />
      </View>

      {/* Error badge */}
      {errorMessage && (
        <View style={styles.failBadge}>
          <Text style={styles.failBadgeText}>✕ {errorMessage}</Text>
        </View>
      )}

      {/* Verify / re-verify button */}
      {hasHandle && (checkState === 'idle' || isUserError) && (
        <Pressable
          onPress={verifyAccount}
          style={({ pressed }) => [styles.verifyBtn, { opacity: pressed ? 0.75 : 1 }]}
          accessibilityRole="button"
        >
          <Text style={styles.verifyBtnText}>驗證帳號</Text>
        </Pressable>
      )}

      {/* Pending review — technical failure, non-blocking */}
      {isPendingReview && (
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingBadgeText}>{PENDING_REVIEW_MESSAGE}</Text>
        </View>
      )}

      {/* Loading */}
      {checkState === 'checking' && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#FF5A3C" />
          <Text style={styles.loadingText}>驗證中…</Text>
        </View>
      )}

      {/* Verified badge */}
      {checkState === 'verified' && (
        <View style={styles.verifiedBadge}>
          <Text style={styles.verifiedBadgeText}>✓ 公開帳號已驗證</Text>
        </View>
      )}
    </OnboardingStepLayout>
  )
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  atSign: { fontSize: 30, color: '#AEADA6', marginRight: 2 },
  input: {
    flex: 1,
    fontSize: 30,
    fontWeight: '400',
    color: '#1F2723',
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 14, color: '#8F9391' },
  verifyBtn: {
    height: 44,
    borderWidth: 1.5,
    borderColor: '#FF5A3C',
    borderRadius: 9999,
    paddingHorizontal: 24,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyBtnText: { fontSize: 15, fontWeight: '600', color: '#FF5A3C' },
  pendingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F0EA',
    borderRadius: 9999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  pendingBadgeText: { fontSize: 14, fontWeight: '500', color: '#8F9391' },
  verifiedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8FAF2',
    borderRadius: 9999,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  verifiedBadgeText: { fontSize: 14, fontWeight: '600', color: '#2DB276' },
  failBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FDEEF2',
    borderRadius: 9999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  failBadgeText: { fontSize: 14, fontWeight: '600', color: '#B22D47' },
})
