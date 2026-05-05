// app/(onboarding)/customer/name.tsx
import { useRef, useState } from 'react'
import { Pressable, TextInput, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useSession } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'

export default function CustomerNameScreen() {
  const router = useRouter()
  const { session } = useSession()
  const inputRef = useRef<TextInput>(null)
  const [name, setName] = useState('')

  function handleNext() {
    const trimmed = name.trim()
    if (!trimmed || !session) return
    router.push('/(onboarding)/customer/phone')
    supabase.from('users').upsert({ id: session.user.id, display_name: trimmed }, { onConflict: 'id' })
      .then(({ error }) => { if (error) console.error('name save failed:', error) })
  }

  return (
    <OnboardingStepLayout
      title="怎麼稱呼你？"
      subtitle="預約時顯示的名稱"
      step={1}
      totalSteps={4}
      onNext={handleNext}
      nextDisabled={!name.trim()}
      onBack={() => router.replace('/(auth)/login' as never)}
    >
      <Pressable style={{ flex: 1 }} onPress={() => inputRef.current?.focus()}>
        <TextInput
          ref={inputRef}
          value={name}
          onChangeText={setName}
          placeholder="輸入名字"
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
