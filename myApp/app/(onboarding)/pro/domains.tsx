// app/(onboarding)/pro/domains.tsx
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from 'tamagui'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'

const DRAFT_KEY = '@vava/proWizardDraft'

const DOMAIN_OPTIONS = [
  { value: 'nails',  label: '美甲' },
  { value: 'lashes', label: '美睫' },
  { value: 'makeup', label: '美妝' },
] as const

export default function ProDomainsScreen() {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>([])

  function toggle(value: string) {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  async function handleNext() {
    if (!selected.length) return
    const raw = await AsyncStorage.getItem(DRAFT_KEY)
    const current = raw ? JSON.parse(raw) : {}
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ ...current, domains: selected }))

    if (selected.includes('nails')) {
      router.push('/(onboarding)/pro/nail-scope' as never)
    } else {
      router.push('/(onboarding)/pro/location' as never)
    }
  }

  return (
    <OnboardingStepLayout
      title="你提供哪些服務？"
      subtitle="可複選"
      step={2}
      totalSteps={6}
      onNext={handleNext}
      nextDisabled={selected.length === 0}
    >
      <View style={styles.options}>
        {DOMAIN_OPTIONS.map((opt) => {
          const isSelected = selected.includes(opt.value)
          return (
            <Pressable
              key={opt.value}
              onPress={() => toggle(opt.value)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              style={[styles.option, isSelected && styles.optionSelected]}
            >
              <Text
                fontSize={16}
                fontWeight={isSelected ? '600' : '400'}
                color={isSelected ? '#FBFBF8' : '#1F2723'}
              >
                {opt.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </OnboardingStepLayout>
  )
}

const styles = StyleSheet.create({
  options: { gap: 12 },
  option: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8E9E9',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FBFBF8',
  },
  optionSelected: {
    backgroundColor: '#FF5A3C',
    borderColor: '#FF5A3C',
  },
})
