// app/(onboarding)/pro/instagram.tsx
import { useState } from 'react'
import { TextInput, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'

const DRAFT_KEY = '@vava/proWizardDraft'

export default function ProInstagramScreen() {
  const router = useRouter()
  const [handle, setHandle] = useState('')

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
      onNext={() => saveAndNext(handle.trim() || null)}
      onSkip={() => saveAndNext(null)}
    >
      <TextInput
        value={handle}
        onChangeText={setHandle}
        placeholder="@your_account"
        placeholderTextColor="#AEADA6"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={() => saveAndNext(handle.trim() || null)}
        style={styles.input}
      />
    </OnboardingStepLayout>
  )
}

const styles = StyleSheet.create({
  input: {
    fontSize: 20,
    color: '#1F2723',
    borderBottomWidth: 1.5,
    borderBottomColor: '#E8E9E9',
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
})
