import { useState } from 'react'
import { Pressable, TextInput, Alert } from 'react-native'
import { YStack, XStack, Text, View } from 'tamagui'
import { useRouter } from 'expo-router'
import { MapPin, Navigation } from 'lucide-react-native'
import * as Location from 'expo-location'

import { StepLayout } from '@/components/booking/StepLayout'
import { useBookingRequest } from '@/lib/booking-context'

export default function LocationScreen() {
  const router = useRouter()
  const { state, dispatch } = useBookingRequest()

  const [address, setAddress] = useState(state.location?.label ?? '')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    state.location ? { lat: state.location.lat, lng: state.location.lng } : null,
  )
  const [loading, setLoading] = useState(false)

  async function handleUseCurrentLocation() {
    setLoading(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('需要定位權限', '請在設定中開啟位置權限以使用此功能')
        return
      }
      const pos = await Location.getCurrentPositionAsync({})
      const [geo] = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      })
      const label = geo
        ? [geo.city, geo.district, geo.street, geo.name].filter(Boolean).join('')
        : `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
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

  const canProceed = address.trim().length > 0

  return (
    <StepLayout
      title="服務地點"
      currentStep={2}
      totalSteps={6}
      onNext={handleConfirm}
      nextDisabled={!canProceed}
    >
      <YStack gap={24} paddingTop={8}>
        {/* GPS button */}
        <Pressable
          onPress={handleUseCurrentLocation}
          disabled={loading}
          style={{ opacity: loading ? 0.6 : 1 }}
        >
          <XStack
            backgroundColor="#F0EDE5"
            borderRadius={8}
            height={56}
            paddingHorizontal={16}
            alignItems="center"
            gap={12}
          >
            <Navigation size={20} color="#1F2723" />
            <Text fontSize={15} fontWeight="600" color="#1F2723" flex={1}>
              {loading ? '定位中...' : '使用目前位置'}
            </Text>
            <MapPin size={18} color="#808868" />
          </XStack>
        </Pressable>

        {/* Resolved address display */}
        {coords && address ? (
          <XStack
            backgroundColor="#EAEAE4"
            borderRadius={8}
            paddingHorizontal={16}
            paddingVertical={12}
            alignItems="center"
            gap={8}
          >
            <MapPin size={16} color="#1F2723" />
            <Text fontSize={14} color="#1F2723" flex={1}>
              {address}
            </Text>
          </XStack>
        ) : null}

        {/* Divider */}
        <XStack alignItems="center" gap={12}>
          <View flex={1} height={1} backgroundColor="#EAEAE4" />
          <Text fontSize={13} color="#808868">
            或手動輸入
          </Text>
          <View flex={1} height={1} backgroundColor="#EAEAE4" />
        </XStack>

        {/* Manual input */}
        <YStack gap={8}>
          <Text fontSize={14} fontWeight="600" color="#1F2723">
            輸入地址
          </Text>
          <TextInput
            value={address}
            onChangeText={(text) => {
              setAddress(text)
              setCoords(null)
            }}
            placeholder="輸入地址"
            placeholderTextColor="#808868"
            style={{
              backgroundColor: '#F0EDE5',
              borderRadius: 8,
              height: 48,
              paddingHorizontal: 16,
              fontSize: 15,
              color: '#1F2723',
            }}
          />
        </YStack>
      </YStack>
    </StepLayout>
  )
}
