// app/(onboarding)/pro/location.tsx
import { useRef, useState } from 'react'
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native'
import { Text, XStack } from 'tamagui'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'
import { AppIcon } from '@/components/AppIcon'

const DRAFT_KEY = '@vava/proWizardDraft'
const PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? ''

type Suggestion = { placeId: string; description: string }

export default function ProLocationScreen() {
  const router = useRouter()
  const [studioName, setStudioName] = useState('')
  const [address, setAddress] = useState('')
  const [floor, setFloor] = useState('')
  const [room, setRoom] = useState('')
  const [focused, setFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const canNext = studioName.trim().length > 0 && address.trim().length > 0

  async function fetchSuggestions(text: string) {
    if (!text.trim() || !PLACES_KEY) { setSuggestions([]); return }
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${PLACES_KEY}&language=zh-TW&components=country:tw`
      const res = await fetch(url)
      const data = await res.json()
      setSuggestions(
        data.status === 'OK'
          ? (data.predictions ?? []).map((p: { place_id: string; description: string }) => ({
              placeId: p.place_id,
              description: p.description,
            }))
          : [],
      )
    } catch {
      setSuggestions([])
    }
  }

  function handleTextChange(text: string) {
    setAddress(text)
    setSuggestions([])
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 350)
  }

  function selectSuggestion(s: Suggestion) {
    setAddress(s.description)
    setSuggestions([])
    Keyboard.dismiss()
  }

  async function handleNext() {
    if (!canNext) return
    const raw = await AsyncStorage.getItem(DRAFT_KEY)
    const current = raw ? JSON.parse(raw) : {}
    const unit = [floor.trim() && `${floor.trim()}樓`, room.trim() && `${room.trim()}室`]
      .filter(Boolean).join('')
    const fullAddress = unit ? `${address.trim()} ${unit}` : address.trim()
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({
      ...current,
      studio_name: studioName.trim(),
      studio_district: '',
      studio_address: fullAddress,
    }))
    router.push('/(onboarding)/pro/phone' as never)
  }

  return (
    <OnboardingStepLayout
      title="工作室地點"
      subtitle="輸入工作室資訊"
      step={3}
      totalSteps={7}
      onNext={handleNext}
      nextDisabled={!canNext}
    >
      <View style={styles.content}>
        {/* Studio / shop name — required */}
        <TextInput
          value={studioName}
          onChangeText={setStudioName}
          placeholder="工作室／店名"
          placeholderTextColor="#999992"
          returnKeyType="done"
          autoCorrect={false}
          autoComplete="off"
          textContentType="none"
          style={styles.nameInput}
        />

        {/* Address autocomplete */}
        <View>
          <TextInput
            value={address}
            onChangeText={handleTextChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="輸入地址"
            placeholderTextColor="#999992"
            returnKeyType="done"
            autoCorrect={false}
            autoComplete="off"
            textContentType="none"
            style={styles.addressInput}
          />
          {focused && address.length > 0 && (
            <Pressable
              onPress={() => { setAddress(''); setSuggestions([]) }}
              style={styles.clearBtn}
            >
              <View style={styles.clearCircle}>
                <AppIcon name="close" size={10} color="#1F2723" />
              </View>
            </Pressable>
          )}
        </View>

        {/* Suggestions — plain View, no nested ScrollView */}
        {suggestions.length > 0 && (
          <View style={styles.suggestionList}>
            <View style={styles.divider} />
            {suggestions.slice(0, 6).map((s, i) => (
              <Pressable
                key={s.placeId}
                onPress={() => selectSuggestion(s)}
                style={({ pressed }) => [
                  styles.suggestionRow,
                  i < suggestions.length - 1 && styles.suggestionBorder,
                  pressed && styles.suggestionPressed,
                ]}
              >
                <XStack gap={10} alignItems="center">
                  <AppIcon name="location" size={13} color="#8F9391" />
                  <Text fontSize={14} color="#1F2723" flex={1} numberOfLines={1}>
                    {s.description}
                  </Text>
                </XStack>
              </Pressable>
            ))}
          </View>
        )}

        {/* Floor + Room — identical keyboard config so iOS never changes keyboard height */}
        <View style={styles.unitRow}>
          <TextInput
            value={floor}
            onChangeText={setFloor}
            placeholder="樓層（選填）"
            placeholderTextColor="#999992"
            keyboardType="default"
            returnKeyType="done"
            autoCorrect={false}
            autoComplete="off"
            textContentType="none"
            style={[styles.unitInput, { flex: 1 }]}
          />
          <TextInput
            value={room}
            onChangeText={setRoom}
            placeholder="室號（選填）"
            placeholderTextColor="#999992"
            keyboardType="default"
            returnKeyType="done"
            autoCorrect={false}
            autoComplete="off"
            textContentType="none"
            style={[styles.unitInput, { flex: 1 }]}
          />
        </View>
      </View>
    </OnboardingStepLayout>
  )
}

const styles = StyleSheet.create({
  content: { gap: 12, paddingTop: 4 },
  nameInput: {
    backgroundColor: '#F3F0EA',
    borderRadius: 8,
    height: 56,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1F2723',
  },
  addressInput: {
    backgroundColor: '#F3F0EA',
    borderRadius: 8,
    height: 56,
    paddingHorizontal: 16,
    paddingRight: 48,
    fontSize: 15,
    color: '#1F2723',
  },
  clearBtn: {
    position: 'absolute',
    right: 4,
    top: 0,
    bottom: 0,
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(31,39,35,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 1, backgroundColor: '#D8D9D2' },
  suggestionList: { borderRadius: 8, overflow: 'hidden', backgroundColor: '#F3F0EA' },
  suggestionRow: {
    height: 48,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  suggestionBorder: { borderBottomWidth: 1, borderBottomColor: '#D8D9D2' },
  suggestionPressed: { backgroundColor: 'rgba(0,0,0,0.03)' },
  unitRow: { flexDirection: 'row', gap: 10 },
  unitInput: {
    backgroundColor: '#F3F0EA',
    borderRadius: 8,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1F2723',
  },
})
