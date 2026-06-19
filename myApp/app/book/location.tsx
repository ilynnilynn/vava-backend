import { useState, useRef } from 'react'
import { Pressable, TextInput, Keyboard, Alert, ScrollView, Linking, TouchableWithoutFeedback } from 'react-native'
import { YStack, XStack, Text, View } from 'tamagui'
import { useRouter } from 'expo-router'
import { AppIcon } from '@/components/AppIcon'
import * as Location from 'expo-location'

import { StepLayout } from '@/components/booking/StepLayout'
import { useBookingRequest } from '@/lib/booking-context'

const PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? ''

type Suggestion = { placeId: string; description: string }

export default function LocationScreen() {
  const router = useRouter()
  const { state, dispatch } = useBookingRequest()

  const [address, setAddress] = useState(state.location?.label ?? '')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    state.location ? { lat: state.location.lat, lng: state.location.lng } : null,
  )
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)
  const [locationBlocked, setLocationBlocked] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    setCoords(null)
    setSuggestions([])
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 350)
  }

  async function handleSelectSuggestion(s: Suggestion) {
    setSuggestions([])
    setAddress(s.description)
    Keyboard.dismiss()
    if (!PLACES_KEY) return
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${s.placeId}&fields=geometry&key=${PLACES_KEY}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.status === 'OK' && data.result?.geometry?.location) {
        const { lat, lng } = data.result.geometry.location
        setCoords({ lat, lng })
      }
    } catch {
      // coords stay null; address text is still usable
    }
  }

  async function handleUseCurrentLocation() {
    setLoading(true)
    setSuggestions([])
    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        if (!canAskAgain) setLocationBlocked(true)
        return
      }
      const pos = await Location.getCurrentPositionAsync({})
      const { latitude, longitude } = pos.coords
      setCoords({ lat: latitude, lng: longitude })

      let label = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
      let resolved = false

      if (PLACES_KEY) {
        try {
          const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${PLACES_KEY}&language=zh-TW`
          const res = await fetch(url)
          const data = await res.json()
          if (data.status === 'OK' && data.results?.[0]?.formatted_address) {
            label = data.results[0].formatted_address
            resolved = true
          }
        } catch {
          // fall through to reverseGeocodeAsync
        }
      }

      if (!resolved) {
        // Google geocode unavailable — try Expo reverse geocode
        try {
          const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude })
          if (geo) {
            const parts = [geo.city, geo.district, geo.street, geo.name].filter(Boolean)
            if (parts.length) label = parts.join('')
          }
        } catch {
          // keep coordinate label as last resort
        }
      }

      setAddress(label)
    } catch {
      Alert.alert('定位失敗', '無法取得目前位置，請手動輸入地址')
    } finally {
      setLoading(false)
    }
  }

  function handleConfirm() {
    if (!address.trim()) {
      Alert.alert('請輸入地址', '請使用定位或手動輸入地址')
      return
    }
    dispatch({
      type: 'SET_LOCATION',
      payload: {
        lat: coords?.lat ?? 0,
        lng: coords?.lng ?? 0,
        label: address.trim(),
      },
    })
    router.push('/book/when')
  }

  return (
    <StepLayout
      title="想在哪裡預約？"
      subtitle="會在指定地點周圍幫你尋找"
      currentStep={2}
      totalSteps={6}
      onNext={handleConfirm}
      nextDisabled={!address.trim()}
      noScroll
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <YStack flex={1} gap={0} paddingTop={16}>
        {/* Address input */}
        <View style={{ position: 'relative' }}>
          <TextInput
            value={address}
            onChangeText={handleTextChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="輸入地址"
            placeholderTextColor="#787D7B"
            style={{
              backgroundColor: '#F3F0EA',
              borderRadius: 8,
              height: 56,
              paddingHorizontal: 16,
              paddingRight: focused && address.length > 0 ? 48 : 16,
              fontSize: 15,
              color: '#1F2723',
            }}
          />
          {focused && address.length > 0 && (
            <Pressable
              onPress={() => { setAddress(''); setCoords(null); setSuggestions([]) }}
              style={{
                position: 'absolute',
                right: 4,
                top: 0,
                bottom: 0,
                width: 48,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <View
                width={20}
                height={20}
                borderRadius={10}
                backgroundColor="rgba(31,39,35,0.15)"
                alignItems="center"
                justifyContent="center"
              >
                <AppIcon name="close" size={10} color="#1F2723" />
              </View>
            </Pressable>
          )}
        </View>

        {/* GPS button */}
        <Pressable
          onPress={handleUseCurrentLocation}
          disabled={loading}
          style={{ opacity: loading ? 0.6 : 1 }}
        >
          <XStack
            height={56}
            paddingHorizontal={16}
            alignItems="center"
            gap={12}
          >
            <AppIcon name="locateMe" size={18} color="#1F2723" />
            <Text fontSize={15} fontWeight="600" color="#1F2723" flex={1}>
              {loading ? '定位中...' : '使用目前位置'}
            </Text>
            {locationBlocked && (
              <Pressable
                onPress={() => Linking.openSettings()}
                style={{
                  borderRadius: 9999,
                  borderWidth: 1,
                  borderColor: '#1F2723',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text fontSize={13} fontWeight="600" color="#1F2723">前往設定</Text>
              </Pressable>
            )}
          </XStack>
        </Pressable>

        {/* Divider + scrollable suggestions fill remaining space */}
        {suggestions.length > 0 && (
          <YStack flex={1}>
            <View height={1} backgroundColor="#D2D3D3" />
            <ScrollView flex={1} showsVerticalScrollIndicator={false} bounces={false} keyboardShouldPersistTaps="always">
              {suggestions.map((s, i) => (
                <Pressable
                  key={s.placeId}
                  onPress={() => handleSelectSuggestion(s)}
                  style={({ pressed }) => ({
                    height: 48,
                    paddingHorizontal: 16,
                    borderBottomWidth: i < suggestions.length - 1 ? 1 : 0,
                    borderBottomColor: '#D2D3D3',
                    backgroundColor: pressed ? 'rgba(0,0,0,0.03)' : 'transparent',
                    justifyContent: 'center',
                  })}
                >
                  <XStack gap={10} alignItems="center">
                    <AppIcon name="location" size={13} color="#787D7B" />
                    <Text fontSize={14} color="#1F2723" flex={1} numberOfLines={1}>
                      {s.description}
                    </Text>
                  </XStack>
                </Pressable>
              ))}
            </ScrollView>
          </YStack>
        )}
      </YStack>
      </TouchableWithoutFeedback>
    </StepLayout>
  )
}
