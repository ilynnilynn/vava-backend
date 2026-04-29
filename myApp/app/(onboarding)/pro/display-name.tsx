// app/(onboarding)/pro/display-name.tsx
import { useState } from 'react'
import { TextInput, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'

const DRAFT_KEY = '@vava/proWizardDraft'

async function saveDraft(patch: Record<string, unknown>) {
  const raw = await AsyncStorage.getItem(DRAFT_KEY)
  const current = raw ? JSON.parse(raw) : {}
  await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ ...current, ...patch }))
}

export default function ProDisplayNameScreen() {
  const router = useRouter()
  const [name, setName] = useState('')

  async function handleNext() {
    const trimmed = name.trim()
    if (!trimmed) return
    await saveDraft({ display_name: trimmed })
    router.push('/(onboarding)/pro/domains' as never)
  }

  return (
    <OnboardingStepLayout
      title="希望客戶怎麼稱呼你？"
      subtitle="顯示在你的設計師主頁"
      step={1}
      totalSteps={6}
      onNext={handleNext}
      nextDisabled={!name.trim()}
    >
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="輸入名字或稱呼"
        placeholderTextColor="#AEADA6"
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleNext}
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
