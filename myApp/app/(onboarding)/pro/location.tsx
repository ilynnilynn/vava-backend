// app/(onboarding)/pro/location.tsx
import { useState } from 'react'
import { TextInput, StyleSheet, View } from 'react-native'
import { Text } from 'tamagui'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'

const DRAFT_KEY = '@vava/proWizardDraft'

export default function ProLocationScreen() {
  const router = useRouter()
  const [district, setDistrict] = useState('')
  const [address, setAddress] = useState('')

  async function handleNext() {
    if (!district.trim() || !address.trim()) return
    const raw = await AsyncStorage.getItem(DRAFT_KEY)
    const current = raw ? JSON.parse(raw) : {}
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({
      ...current,
      studio_district: district.trim(),
      studio_address: address.trim(),
    }))
    router.push('/(onboarding)/pro/instagram' as never)
  }

  return (
    <OnboardingStepLayout
      title="工作室地點"
      step={4}
      totalSteps={6}
      onNext={handleNext}
      nextDisabled={!district.trim() || !address.trim()}
    >
      <View style={styles.fields}>
        <Text fontSize={13} color="#626765" marginBottom={6}>行政區</Text>
        <TextInput
          value={district}
          onChangeText={setDistrict}
          placeholder="例：大安區"
          placeholderTextColor="#AEADA6"
          returnKeyType="next"
          style={styles.input}
        />
        <Text fontSize={13} color="#626765" marginTop={20} marginBottom={6}>詳細地址</Text>
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="例：信義路四段 1 號"
          placeholderTextColor="#AEADA6"
          returnKeyType="done"
          onSubmitEditing={handleNext}
          style={styles.input}
        />
      </View>
    </OnboardingStepLayout>
  )
}

const styles = StyleSheet.create({
  fields: { paddingTop: 8 },
  input: {
    fontSize: 18,
    color: '#1F2723',
    borderBottomWidth: 1.5,
    borderBottomColor: '#E8E9E9',
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
})
