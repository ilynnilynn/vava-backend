// app/(onboarding)/customer/phone.tsx
import { useRef, useState } from 'react'
import { InputAccessoryView, Platform, Pressable, TextInput, StyleSheet, View } from 'react-native'

const ACCESSORY_ID = 'phone-input-accessory'
import { useRouter } from 'expo-router'
import { useSession } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'

function formatPhone(digits: string): string {
  if (digits.length <= 4) return digits
  if (digits.length <= 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`
  return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7, 10)}`
}

export default function CustomerPhoneScreen() {
  const router = useRouter()
  const { session } = useSession()
  const inputRef = useRef<TextInput>(null)
  const [phone, setPhone] = useState('')

  function handleChangeText(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 10)
    setPhone(formatPhone(digits))
  }

  function handleNext() {
    const trimmed = phone.replace(/\D/g, '')
    if (!trimmed || !session) return
    router.push('/(onboarding)/customer/birthday')
    supabase.from('users').upsert({ id: session.user.id, phone: trimmed }, { onConflict: 'id' })
      .then(({ error }) => { if (error) console.error('phone save failed:', error) })
  }

  return (
    <OnboardingStepLayout
      title="你的手機號碼？"
      subtitle="用於預約通知，不對外公開"
      step={2}
      totalSteps={4}
      onNext={handleNext}
      nextDisabled={!phone.trim()}
    >
      <Pressable style={{ flex: 1 }} onPress={() => inputRef.current?.focus()}>
        <TextInput
          ref={inputRef}
          value={phone}
          onChangeText={handleChangeText}
          placeholder="0900-000-000"
          placeholderTextColor="#AEADA6"
          keyboardType="phone-pad"
          autoFocus
          inputAccessoryViewID={Platform.OS === 'ios' ? ACCESSORY_ID : undefined}
          onSubmitEditing={handleNext}
          style={styles.input}
        />
      </Pressable>
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={ACCESSORY_ID}>
          <View />
        </InputAccessoryView>
      )}
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
