// app/(onboarding)/customer/birthday.tsx
import { useState } from 'react'
import { Alert, TextInput, StyleSheet, View } from 'react-native'
import { Text } from 'tamagui'
import { useRouter } from 'expo-router'
import { useSession } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'

function isValidDate(str: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false
  const d = new Date(str)
  return d instanceof Date && !isNaN(d.getTime()) && d < new Date()
}

export default function CustomerBirthdayScreen() {
  const router = useRouter()
  const { session } = useSession()
  const [birthday, setBirthday] = useState('')
  const [saving, setSaving] = useState(false)

  const isValid = isValidDate(birthday)

  async function handleNext() {
    if (!isValid || !session) return
    setSaving(true)
    const { error } = await supabase
      .from('users')
      .upsert({ id: session.user.id, birthday }, { onConflict: 'id' })
    setSaving(false)
    if (error) {
      Alert.alert('儲存失敗', error.message)
      return
    }
    router.push('/(onboarding)/customer/gender')
  }

  return (
    <OnboardingStepLayout
      title="你的生日？"
      subtitle="格式：YYYY-MM-DD"
      step={3}
      totalSteps={4}
      onNext={handleNext}
      nextDisabled={!isValid || saving}
    >
      <View>
        <TextInput
          value={birthday}
          onChangeText={setBirthday}
          placeholder="1995-06-15"
          placeholderTextColor="#AEADA6"
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleNext}
          style={styles.input}
        />
        {birthday.length > 0 && !isValid && (
          <Text fontSize={13} color="#CC3352" marginTop={8}>
            請輸入正確日期格式（YYYY-MM-DD）
          </Text>
        )}
      </View>
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
