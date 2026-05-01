// app/(onboarding)/pro/instagram.tsx
import { useState } from 'react'
import { Linking, Pressable, StyleSheet, TextInput, View } from 'react-native'
import { Text } from 'tamagui'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'
import { AppIcon } from '@/components/AppIcon'

const DRAFT_KEY = '@vava/proWizardDraft'

export default function ProInstagramScreen() {
  const router = useRouter()
  const [handle, setHandle] = useState('')
  const [verified, setVerified] = useState(false)

  const trimmedHandle = handle.trim().replace(/^@/, '')
  const hasHandle = trimmedHandle.length > 0

  async function openInstagram() {
    // Try the Instagram app deep link first; fall back to web URL
    const appUrl = `instagram://user?username=${trimmedHandle}`
    const webUrl = `https://www.instagram.com/${trimmedHandle}/`
    const canOpen = await Linking.canOpenURL(appUrl)
    await Linking.openURL(canOpen ? appUrl : webUrl)
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
          onChangeText={(t) => { setHandle(t); setVerified(false) }}
          placeholder="your_account"
          placeholderTextColor="#AEADA6"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          style={styles.input}
        />
      </View>

      {/* Open Instagram button — appears once handle is typed */}
      {hasHandle && !verified && (
        <Pressable
          onPress={openInstagram}
          style={({ pressed }) => [styles.verifyBtn, { opacity: pressed ? 0.75 : 1 }]}
          accessibilityRole="button"
        >
          <AppIcon name="forward" size={14} color="#FF5A3C" />
          <Text style={styles.verifyBtnText}>前往 Instagram 確認</Text>
        </Pressable>
      )}

      {/* Confirm button — appears after user has opened Instagram */}
      {hasHandle && !verified && (
        <Pressable
          onPress={() => setVerified(true)}
          style={({ pressed }) => [styles.confirmBtn, { opacity: pressed ? 0.75 : 1 }]}
          accessibilityRole="button"
        >
          <Text style={styles.confirmBtnText}>✓ 確認是我的帳號</Text>
        </Pressable>
      )}

      {/* Verified state */}
      {verified && (
        <View style={styles.verifiedRow}>
          <Text style={styles.checkMark}>✓</Text>
          <Text style={styles.verifiedText}>@{trimmedHandle} 已連結</Text>
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
    marginBottom: 20,
  },
  atSign: { fontSize: 20, color: '#AEADA6', marginRight: 4 },
  input: {
    flex: 1,
    fontSize: 20,
    color: '#1F2723',
    paddingVertical: 8,
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#FF5A3C',
    borderRadius: 9999,
    height: 44,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  verifyBtnText: { fontSize: 15, fontWeight: '600', color: '#FF5A3C' },
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
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  checkMark: { fontSize: 16, color: '#33CC87' },
  verifiedText: { fontSize: 15, color: '#33CC87', fontWeight: '600' },
})
