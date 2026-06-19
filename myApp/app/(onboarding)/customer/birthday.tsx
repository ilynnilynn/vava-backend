// app/(onboarding)/customer/birthday.tsx
import { useRef, useState } from 'react'
import { Pressable, TextInput, StyleSheet } from 'react-native'
import { Text } from 'tamagui'
import { useRouter } from 'expo-router'
import { useSession } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'

// Format 8 raw digits into YYYY-MM-DD, inserting dashes automatically
function formatBirthday(digits: string): string {
  if (digits.length <= 4) return digits
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
}

function isValidDate(str: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false
  const d = new Date(str)
  return d instanceof Date && !isNaN(d.getTime()) && d < new Date()
}

export default function CustomerBirthdayScreen() {
  const router = useRouter()
  const { session } = useSession()
  const inputRef = useRef<TextInput>(null)
  const [birthday, setBirthday] = useState('')
  const [touched, setTouched] = useState(false)

  const isValid = isValidDate(birthday)

  function handleChangeText(text: string) {
    // Strip all non-digits, cap at 8 digits, then reformat
    const digits = text.replace(/\D/g, '').slice(0, 8)
    setBirthday(formatBirthday(digits))
  }

  function handleNext() {
    if (!isValid || !session) return
    router.push('/(onboarding)/customer/gender')
    supabase.from('users').upsert({ id: session.user.id, birthday }, { onConflict: 'id' })
      .then(({ error }) => { if (error) console.error('birthday save failed:', error) })
  }

  return (
    <OnboardingStepLayout
      title="你的生日？"
      step={3}
      totalSteps={4}
      onNext={handleNext}
      nextDisabled={!isValid}
    >
      <Pressable style={{ flex: 1 }} onPress={() => inputRef.current?.focus()}>
        <TextInput
          ref={inputRef}
          value={birthday}
          onChangeText={handleChangeText}
          placeholder="1995-06-15"
          placeholderTextColor="#AEADA6"
          keyboardType="number-pad"
          maxLength={10}
          autoFocus
          onSubmitEditing={handleNext}
          onBlur={() => setTouched(true)}
          style={styles.input}
        />
        {touched && birthday.length > 0 && !isValid && (
          <Text fontSize={13} color="#CC3352" marginTop={8}>
            請輸入正確日期（年月日）
          </Text>
        )}
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
