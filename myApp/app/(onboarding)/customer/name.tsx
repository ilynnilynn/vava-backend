// app/(onboarding)/customer/name.tsx
import { useState } from 'react'
import { Alert, TextInput, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useSession } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'

export default function CustomerNameScreen() {
  const router = useRouter()
  const { session } = useSession()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleNext() {
    const trimmed = name.trim()
    if (!trimmed || !session) return
    setSaving(true)
    const { error } = await supabase
      .from('users')
      .upsert({ id: session.user.id, display_name: trimmed }, { onConflict: 'id' })
    setSaving(false)
    if (error) {
      Alert.alert('儲存失敗', error.message)
      return
    }
    router.push('/(onboarding)/customer/phone')
  }

  return (
    <OnboardingStepLayout
      title="你希望我們怎麼稱呼你？"
      step={1}
      totalSteps={4}
      onNext={handleNext}
      nextDisabled={!name.trim() || saving}
    >
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="輸入名字"
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
