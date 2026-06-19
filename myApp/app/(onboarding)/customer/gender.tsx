// app/(onboarding)/customer/gender.tsx
import { useState } from 'react'
import { Alert, Pressable, StyleSheet, View } from 'react-native'
import { Text } from 'tamagui'
import { useRouter } from 'expo-router'
import { useSession } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'

const OPTIONS = [
  { value: 'male',       label: '男性' },
  { value: 'female',     label: '女性' },
  { value: 'other',      label: '其他' },
  { value: 'prefer_not', label: '不便透露' },
] as const

type GenderValue = typeof OPTIONS[number]['value']

export default function CustomerGenderScreen() {
  const router = useRouter()
  const { session, refreshUser } = useSession()
  const [selected, setSelected] = useState<GenderValue | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleNext() {
    if (!selected || !session) return
    setSaving(true)
    const { error } = await supabase
      .from('users')
      .upsert({ id: session.user.id, gender: selected }, { onConflict: 'id' })
    if (error) {
      setSaving(false)
      Alert.alert('儲存失敗', error.message)
      return
    }
    // Sync auth-context with the users row we just wrote so the rest of the
    // session has correct user/onboardingComplete values.
    await refreshUser()
    setSaving(false)
    router.replace('/(tabs)/' as never)
  }

  return (
    <OnboardingStepLayout
      title="你的性別？"
      step={4}
      totalSteps={4}
      onNext={handleNext}
      nextLabel="完成"
      nextDisabled={!selected || saving}
    >
      <View style={[styles.options, { marginTop: 16 }]}>
        {OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => setSelected(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: selected === opt.value }}
            style={[styles.option, selected === opt.value && styles.optionSelected]}
          >
            <Text
              fontSize={16}
              fontWeight={selected === opt.value ? '600' : '400'}
              color={selected === opt.value ? '#FBFBF8' : '#1F2723'}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </OnboardingStepLayout>
  )
}

const styles = StyleSheet.create({
  options: { gap: 12 },
  option: {
    height: 52,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: '#E8E9E9',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FBFBF8',
  },
  optionSelected: {
    backgroundColor: '#1F2723',
    borderColor: '#1F2723',
  },
})
