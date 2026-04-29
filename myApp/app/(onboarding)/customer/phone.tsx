// app/(onboarding)/customer/phone.tsx
import { useState } from 'react'
import { Alert, TextInput, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useSession } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'

export default function CustomerPhoneScreen() {
  const router = useRouter()
  const { session } = useSession()
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleNext() {
    const trimmed = phone.trim()
    if (!trimmed || !session) return
    setSaving(true)
    const { error } = await supabase
      .from('users')
      .upsert({ id: session.user.id, phone: trimmed }, { onConflict: 'id' })
    setSaving(false)
    if (error) {
      Alert.alert('儲存失敗', error.message)
      return
    }
    router.push('/(onboarding)/customer/birthday')
  }

  return (
    <OnboardingStepLayout
      title="你的手機號碼？"
      subtitle="用於預約通知，不對外公開"
      step={2}
      totalSteps={4}
      onNext={handleNext}
      nextDisabled={!phone.trim() || saving}
    >
      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder="09XXXXXXXX"
        placeholderTextColor="#AEADA6"
        keyboardType="phone-pad"
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
