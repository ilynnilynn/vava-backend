// app/(onboarding)/pro/location.tsx
import { useRef, useState } from 'react'
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native'
import { Text } from 'tamagui'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'
import { AppIcon } from '@/components/AppIcon'
import { TAIWAN_CITIES, type TaiwanCity } from '@/constants/taiwan-districts'

const DRAFT_KEY = '@vava/proWizardDraft'
const MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
const PLACES_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json'

export default function ProLocationScreen() {
  const router = useRouter()
  const [city, setCity] = useState<string | null>(null)
  const [district, setDistrict] = useState<string | null>(null)
  const [address, setAddress] = useState('')
  const [streetText, setStreetText] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showCityPicker, setShowCityPicker] = useState(false)
  const [showDistrictPicker, setShowDistrictPicker] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cityData: TaiwanCity | undefined = TAIWAN_CITIES.find((c) => c.name === city)
  const canNext = !!city && !!district && address.trim().length > 0

  async function fetchSuggestions(text: string, currentDistrict: string) {
    if (text.length < 2) { setSuggestions([]); return }
    try {
      const input = encodeURIComponent(`${currentDistrict} ${text}`)
      const res = await fetch(
        `${PLACES_URL}?input=${input}&components=country:tw&language=zh-TW&key=${MAPS_KEY}`
      )
      const json = await res.json()
      if (json.status === 'OK') {
        // Only keep results that mention the selected district
        const filtered: string[] = json.predictions
          .filter((p: { description: string }) => p.description.includes(currentDistrict))
          .map((p: { description: string }) => p.description)
        setSuggestions(filtered)
      } else {
        setSuggestions([])
      }
    } catch {
      setSuggestions([])
    }
  }

  function handleStreetChange(text: string) {
    setStreetText(text)
    setAddress('')
    if (!text) { setSuggestions([]); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (district) {
      debounceRef.current = setTimeout(() => fetchSuggestions(text, district), 350)
    }
  }

  function selectSuggestion(description: string) {
    setAddress(description)
    setStreetText(description)
    setSuggestions([])
  }

  async function handleNext() {
    if (!canNext) return
    const raw = await AsyncStorage.getItem(DRAFT_KEY)
    const current = raw ? JSON.parse(raw) : {}
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({
      ...current,
      studio_district: `${city} ${district}`,
      studio_address: address.trim(),
    }))
    router.push('/(onboarding)/pro/display-name' as never)
  }

  function selectCity(name: string) {
    setCity(name)
    setDistrict(null)
    setAddress('')
    setStreetText('')
    setSuggestions([])
    setShowCityPicker(false)
  }

  function selectDistrict(name: string) {
    setDistrict(name)
    setAddress('')
    setStreetText('')
    setSuggestions([])
    setShowDistrictPicker(false)
  }

  return (
    <OnboardingStepLayout
      title="工作室地點"
      step={3}
      totalSteps={6}
      onNext={handleNext}
      nextDisabled={!canNext}
    >
      {/* City picker trigger */}
      <Text style={styles.label}>城市</Text>
      <Pressable
        onPress={() => setShowCityPicker(true)}
        style={[styles.selector, city ? styles.selectorFilled : null]}
        accessibilityRole="button"
        accessibilityLabel="選擇城市"
      >
        <Text style={[styles.selectorText, !city && styles.placeholder]}>
          {city ?? '選擇城市'}
        </Text>
        <AppIcon name="chevronDown" size={16} color="#626765" />
      </Pressable>

      {/* District picker trigger */}
      <Text style={[styles.label, styles.labelSpaced]}>行政區</Text>
      <Pressable
        onPress={() => city ? setShowDistrictPicker(true) : undefined}
        style={[styles.selector, district ? styles.selectorFilled : null, !city && styles.selectorDisabled]}
        accessibilityRole="button"
        accessibilityLabel="選擇行政區"
      >
        <Text style={[styles.selectorText, !district && styles.placeholder]}>
          {district ?? '選擇行政區'}
        </Text>
        <AppIcon name="chevronDown" size={16} color={city ? '#626765' : '#C8C9C8'} />
      </Pressable>

      {/* Address autocomplete — filtered to selected district */}
      <Text style={[styles.label, styles.labelSpaced]}>詳細地址</Text>
      <TextInput
        value={streetText}
        onChangeText={handleStreetChange}
        placeholder={district ? `在 ${district} 搜尋地址` : '先選擇行政區'}
        placeholderTextColor="#AEADA6"
        editable={!!district}
        returnKeyType="done"
        style={[styles.addressInput, !district && styles.selectorDisabled]}
      />
      {suggestions.length > 0 && (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item}
          style={styles.suggestionList}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable onPress={() => selectSuggestion(item)} style={styles.suggestionRow}>
              <Text style={styles.suggestionText}>{item}</Text>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* City picker modal */}
      <Modal visible={showCityPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCityPicker(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>選擇城市</Text>
            <Pressable onPress={() => setShowCityPicker(false)} style={styles.modalClose}>
              <AppIcon name="close" size={20} color="#626765" />
            </Pressable>
          </View>
          <FlatList
            data={TAIWAN_CITIES}
            keyExtractor={(item) => item.name}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => selectCity(item.name)}
                style={[styles.modalRow, city === item.name && styles.modalRowSelected]}
              >
                <Text style={[styles.modalRowText, city === item.name && styles.modalRowTextSelected]}>
                  {item.name}
                </Text>
                {city === item.name && <Text style={styles.checkMark}>✓</Text>}
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </Modal>

      {/* District picker modal */}
      <Modal visible={showDistrictPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowDistrictPicker(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>選擇行政區</Text>
            <Pressable onPress={() => setShowDistrictPicker(false)} style={styles.modalClose}>
              <AppIcon name="close" size={20} color="#626765" />
            </Pressable>
          </View>
          <FlatList
            data={cityData?.districts ?? []}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => selectDistrict(item)}
                style={[styles.modalRow, district === item && styles.modalRowSelected]}
              >
                <Text style={[styles.modalRowText, district === item && styles.modalRowTextSelected]}>
                  {item}
                </Text>
                {district === item && <Text style={styles.checkMark}>✓</Text>}
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </Modal>
    </OnboardingStepLayout>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 13, color: '#626765', marginBottom: 8 },
  labelSpaced: { marginTop: 20 },
  selector: {
    height: 48,
    borderWidth: 1.5,
    borderColor: '#E8E9E9',
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FBFBF8',
  },
  selectorFilled: { borderColor: '#1F2723' },
  selectorDisabled: { backgroundColor: '#F6F4EF', opacity: 0.5 },
  selectorText: { fontSize: 16, color: '#1F2723' },
  placeholder: { color: '#AEADA6' },
  addressInput: {
    height: 48,
    borderWidth: 1.5,
    borderColor: '#E8E9E9',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#1F2723',
    backgroundColor: '#FBFBF8',
  },
  suggestionList: {
    borderWidth: 1,
    borderColor: '#E8E9E9',
    borderRadius: 10,
    marginTop: 4,
    maxHeight: 220,
  },
  suggestionRow: { paddingHorizontal: 14, paddingVertical: 12 },
  suggestionText: { fontSize: 14, color: '#1F2723' },
  modal: { flex: 1, backgroundColor: '#FBFBF8' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E9E9',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1F2723' },
  modalClose: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalRowSelected: { backgroundColor: '#FFF5F3' },
  modalRowText: { fontSize: 16, color: '#1F2723' },
  modalRowTextSelected: { fontWeight: '600', color: '#FF5A3C' },
  checkMark: { fontSize: 14, color: '#FF5A3C' },
  separator: { height: 1, backgroundColor: '#E8E9E9', marginHorizontal: 20 },
})
