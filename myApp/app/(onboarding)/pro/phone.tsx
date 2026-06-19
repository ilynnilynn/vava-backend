// app/(onboarding)/pro/phone.tsx
// B007: Repurposed from phone number to LINE ID.
// Phone is already collected during account signup — no need to ask again.
// LINE ID is shared with customers after a booking is confirmed.
import { useRef, useState } from 'react'
import { Pressable, StyleSheet, TextInput } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'

const DRAFT_KEY = '@vava/proWizardDraft'

export default function ProLineIdScreen() {
  const router = useRouter()
  const inputRef = useRef<TextInput>(null)
  const [lineId, setLineId] = useState('')

  const canNext = lineId.trim().length > 0

  async function handleNext() {
    if (!canNext) return
    const raw = await AsyncStorage.getItem(DRAFT_KEY)
    const current = raw ? JSON.parse(raw) : {}
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ ...current, line_id: lineId.trim() }))
    router.push('/(onboarding)/pro/display-name' as never)
  }

  return (
    <OnboardingStepLayout
      title="LINE ID"
      subtitle="預約成立後，我們會提供給顧客方便聯繫。"
      step={4}
      totalSteps={7}
      onNext={handleNext}
      nextDisabled={!canNext}
    >
      <Pressable style={{ flex: 1 }} onPress={() => inputRef.current?.focus()}>
        <TextInput
          ref={inputRef}
          value={lineId}
          onChangeText={setLineId}
          placeholder="你的 LINE ID"
          placeholderTextColor="#AEADA6"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          textContentType="none"
          returnKeyType="done"
          autoFocus
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
