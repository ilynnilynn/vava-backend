// app/(onboarding)/pro/instagram.tsx
// ⚠️  DO NOT change the Instagram verification endpoint or approach.
//     LOCKED: www.instagram.com/api/v1/users/web_profile_info/ + X-IG-App-ID: 936619743392459
//     - i.instagram.com returns 401 (requires auth session)
//     - HTML scraping is unreliable (Instagram uses client-side rendering)
//     - This endpoint returns real JSON (is_private, 404 for non-existent)
import { useState } from 'react'
import { ActivityIndicator, Linking, Pressable, StyleSheet, TextInput, View } from 'react-native'
import { Text } from 'tamagui'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'
import { AppIcon } from '@/components/AppIcon'

const DRAFT_KEY = '@vava/proWizardDraft'

// Instagram's web profile API — returns JSON with is_private field without OAuth
const IG_API_URL = 'https://www.instagram.com/api/v1/users/web_profile_info/'
const IG_APP_ID = '936619743392459'

type CheckState = 'idle' | 'checking' | 'verified' | 'not_found' | 'private' | 'manual'

export default function ProInstagramScreen() {
  const router = useRouter()
  const [handle, setHandle] = useState('')
  const [checkState, setCheckState] = useState<CheckState>('idle')

  const trimmedHandle = handle.trim().replace(/^@/, '')
  const hasHandle = trimmedHandle.length > 0
  const verified = checkState === 'verified'

  function onHandleChange(t: string) {
    setHandle(t)
    if (checkState !== 'idle') setCheckState('idle')
  }

  async function verifyAccount() {
    if (!trimmedHandle) return
    setCheckState('checking')
    try {
      const res = await fetch(
        `${IG_API_URL}?username=${encodeURIComponent(trimmedHandle)}`,
        {
          headers: {
            'X-IG-App-ID': IG_APP_ID,
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
          },
        }
      )

      if (res.status === 404) {
        setCheckState('not_found')
        return
      }

      if (!res.ok) {
        // 401/403/other — Instagram blocked; fall back to manual
        setCheckState('manual')
        return
      }

      try {
        const json = await res.json()
        const user = json?.data?.user
        if (!user) {
          setCheckState('manual')
          return
        }
        if (user.is_private) {
          setCheckState('private')
          return
        }
        setCheckState('verified')
      } catch {
        setCheckState('manual')
      }
    } catch {
      // Network error — fall back to manual
      setCheckState('manual')
    }
  }

  async function openInstagram() {
    const appUrl = `instagram://user?username=${trimmedHandle}`
    const webUrl = `https://www.instagram.com/${trimmedHandle}/`
    try {
      const canOpen = await Linking.canOpenURL(appUrl)
      await Linking.openURL(canOpen ? appUrl : webUrl)
    } catch {
      await Linking.openURL(webUrl)
    }
  }

  async function saveAndNext(value: string | null) {
    const raw = await AsyncStorage.getItem(DRAFT_KEY)
    const current = raw ? JSON.parse(raw) : {}
    const patch = value ? { ig_handle: value } : {}
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ ...current, ...patch }))
    router.push('/(onboarding)/pro/id-photo' as never)
  }

  return (
    <OnboardingStepLayout
      title="連結 Instagram 工作帳號"
      subtitle="讓客人看到你的作品（可略過）"
      step={5}
      totalSteps={6}
      onNext={() => saveAndNext(verified ? trimmedHandle : null)}
      onSkip={() => saveAndNext(null)}
      nextDisabled={hasHandle && !verified}
    >
      {/* Handle input */}
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

      {/* Failure badges */}
      {checkState === 'not_found' && (
        <View style={styles.failBadge}>
          <Text style={styles.failBadgeText}>✕ 找不到此帳號，請確認用戶名稱</Text>
        </View>
      )}
      {checkState === 'private' && (
        <View style={styles.failBadge}>
          <Text style={styles.failBadgeText}>✕ 私人帳號，請先將帳號設為公開</Text>
        </View>
      )}

      {/* Verify button */}
      {hasHandle && checkState === 'idle' && (
        <Pressable
          onPress={verifyAccount}
          style={({ pressed }) => [styles.verifyBtn, { opacity: pressed ? 0.75 : 1 }]}
          accessibilityRole="button"
        >
          <Text style={styles.verifyBtnText}>驗證帳號</Text>
        </Pressable>
      )}

      {/* Re-verify after error */}
      {hasHandle && (checkState === 'not_found' || checkState === 'private') && (
        <Pressable
          onPress={() => setCheckState('idle')}
          style={({ pressed }) => [styles.retryBtn, { opacity: pressed ? 0.75 : 1 }]}
          accessibilityRole="button"
        >
          <Text style={styles.retryBtnText}>重新輸入</Text>
        </Pressable>
      )}

      {/* Loading */}
      {checkState === 'checking' && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#FF5A3C" />
          <Text style={styles.loadingText}>驗證中…</Text>
        </View>
      )}

      {/* Manual fallback — Instagram blocked the check */}
      {checkState === 'manual' && (
        <View style={styles.manualBlock}>
          <Text style={styles.manualHint}>無法自動驗證，請前往 Instagram 確認帳號為公開</Text>
          <Pressable
            onPress={openInstagram}
            style={({ pressed }) => [styles.verifyBtn, { opacity: pressed ? 0.75 : 1 }]}
            accessibilityRole="button"
          >
            <AppIcon name="forward" size={14} color="#FF5A3C" />
            <Text style={styles.verifyBtnText}>前往 Instagram</Text>
          </Pressable>
          <Pressable
            onPress={() => setCheckState('verified')}
            style={({ pressed }) => [styles.confirmBtn, { opacity: pressed ? 0.75 : 1 }]}
            accessibilityRole="button"
          >
            <Text style={styles.confirmBtnText}>✓ 確認是公開帳號</Text>
          </Pressable>
        </View>
      )}

      {/* Auto-verified badge */}
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
    borderBottomWidth: 1.5,
    borderBottomColor: '#E8E9E9',
    paddingVertical: 4,
    marginBottom: 16,
  },
  atSign: { fontSize: 20, color: '#AEADA6', marginRight: 4 },
  input: {
    flex: 1,
    fontSize: 20,
    color: '#1F2723',
    paddingVertical: 8,
  },
  errorText: { fontSize: 13, color: '#CC3352', marginBottom: 14 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 14, color: '#626765' },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    borderWidth: 1.5,
    borderColor: '#FF5A3C',
    borderRadius: 9999,
    paddingHorizontal: 24,
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  verifyBtnText: { fontSize: 15, fontWeight: '600', color: '#FF5A3C' },
  retryBtn: {
    height: 36,
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  retryBtnText: { fontSize: 14, color: '#626765', textDecorationLine: 'underline' },
  manualBlock: { gap: 12 },
  manualHint: { fontSize: 13, color: '#626765', marginBottom: 4 },
  confirmBtn: {
    backgroundColor: '#F6F4EF',
    borderRadius: 9999,
    height: 44,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: { fontSize: 15, color: '#626765' },
  verifiedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8FAF2',
    borderRadius: 9999,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  verifiedBadgeText: { fontSize: 14, fontWeight: '600', color: '#33CC87' },
  failBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FDEEF2',
    borderRadius: 9999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  failBadgeText: { fontSize: 14, fontWeight: '600', color: '#CC3352' },
})
