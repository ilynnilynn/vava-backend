// app/(onboarding)/pro/display-name.tsx
import { useRef, useState } from 'react'
import { Pressable, TextInput, StyleSheet } from 'react-native'
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
  const inputRef = useRef<TextInput>(null)
  const [name, setName] = useState('')

  async function handleNext() {
    const trimmed = name.trim()
    if (!trimmed) return
    await saveDraft({ display_name: trimmed })
    router.push('/(onboarding)/pro/instagram' as never)
  }

  return (
    <OnboardingStepLayout
      title="希望客戶怎麼稱呼你？"
      subtitle="顯示在你的設計師主頁"
      step={5}
      totalSteps={7}
      onNext={handleNext}
      nextDisabled={!name.trim()}
    >
      <Pressable style={{ flex: 1 }} onPress={() => inputRef.current?.focus()}>
        <TextInput
          ref={inputRef}
          value={name}
          onChangeText={setName}
          placeholder="輸入名字或稱呼"
          placeholderTextColor="#AEADA6"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleNext}
          style={styles.input}
        />
      </Pressable>
    </OnboardingStepLayout>
  )
}

const styles = StyleSheet.create({
  input: {
    fontSize: 30,
    fontWeight: '400',
    color: '#1F2723',
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
})
