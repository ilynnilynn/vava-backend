import { useState } from 'react'
import { Pressable, TextInput, Alert } from 'react-native'
import { YStack, XStack, Text, Switch } from 'tamagui'
import { useRouter } from 'expo-router'
import { Camera } from 'lucide-react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'

import { StepLayout } from '@/components/booking/StepLayout'
import { useBookingRequest } from '@/lib/booking-context'

export default function ExtrasScreen() {
  const router = useRouter()
  const { state, dispatch } = useBookingRequest()

  const services = state.services?.categoryIds ?? []
  const category = state.category

  // Add-on visibility
  const showNailAddon =
    category === 'nails' && (services.includes('凝膠') || services.includes('修補'))
  const showLashAddon =
    category === 'lashes' && (services.includes('嫁接') || services.includes('補睫'))

  // State
  const [extensionAddon, setExtensionAddon] = useState(
    state.addons.includes('延甲'),
  )
  const [lowerLashAddon, setLowerLashAddon] = useState(
    state.addons.includes('下睫毛'),
  )
  const [silentService, setSilentService] = useState(
    state.preferences.includes('靜默服務'),
  )
  const [note, setNote] = useState(state.customerNote)
  const [photoUri, setPhotoUri] = useState<string | null>(state.refPhotoUrl)

  async function handlePickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('需要相簿權限', '請在設定中開啟相簿權限以上傳參考圖片')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    })
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri)
    }
  }

  function handleConfirm() {
    // Build addons array
    const addons: string[] = []
    if (showNailAddon && extensionAddon) addons.push('延甲')
    if (showLashAddon && lowerLashAddon) addons.push('下睫毛')

    dispatch({ type: 'SET_ADDONS', payload: addons })
    dispatch({
      type: 'SET_EXTRAS',
      payload: {
        preferences: silentService ? ['靜默服務'] : [],
        customerNote: note,
        refPhotoUrl: photoUri,
      },
    })
    router.push('/book/slots')
  }

  return (
    <StepLayout
      title="其他需求"
      currentStep={5}
      totalSteps={6}
      onNext={handleConfirm}
      nextLabel="搜尋可預約時段"
    >
      <YStack gap={24} paddingTop={8}>
        {/* Add-ons */}
        {(showNailAddon || showLashAddon) && (
          <YStack gap={12}>
            <Text fontSize={16} fontWeight="700" color="#1F2723">
              加購項目
            </Text>
            {showNailAddon && (
              <ToggleRow
                label="延甲"
                value={extensionAddon}
                onValueChange={setExtensionAddon}
              />
            )}
            {showLashAddon && (
              <ToggleRow
                label="下睫毛"
                value={lowerLashAddon}
                onValueChange={setLowerLashAddon}
              />
            )}
          </YStack>
        )}

        {/* Preferences */}
        <YStack gap={12}>
          <Text fontSize={16} fontWeight="700" color="#1F2723">
            偏好設定
          </Text>
          <ToggleRow
            label="靜默服務"
            subtitle="服務過程中不聊天"
            value={silentService}
            onValueChange={setSilentService}
          />
        </YStack>

        {/* Notes */}
        <YStack gap={12}>
          <Text fontSize={16} fontWeight="700" color="#1F2723">
            備註
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="有什麼想跟設計師說的嗎？"
            placeholderTextColor="#808868"
            multiline
            style={{
              backgroundColor: '#F0EDE5',
              borderRadius: 8,
              height: 100,
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 12,
              fontSize: 15,
              color: '#1F2723',
              textAlignVertical: 'top',
            }}
          />
        </YStack>

        {/* Reference photo */}
        <YStack gap={12}>
          <Text fontSize={16} fontWeight="700" color="#1F2723">
            參考圖片
          </Text>
          {photoUri ? (
            <YStack gap={8}>
              <Image
                source={{ uri: photoUri }}
                style={{ width: '100%', height: 200, borderRadius: 8 }}
                contentFit="cover"
              />
              <Pressable
                onPress={() => setPhotoUri(null)}
                style={{
                  alignSelf: 'flex-start',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: '#EAEAE4',
                  borderRadius: 9999,
                }}
              >
                <Text fontSize={13} color="#1F2723">
                  移除
                </Text>
              </Pressable>
            </YStack>
          ) : (
            <Pressable onPress={handlePickImage}>
              <XStack
                backgroundColor="#F0EDE5"
                borderRadius={8}
                height={56}
                paddingHorizontal={16}
                alignItems="center"
                gap={12}
              >
                <Camera size={20} color="#1F2723" />
                <Text fontSize={15} color="#1F2723">
                  上傳參考圖片
                </Text>
              </XStack>
            </Pressable>
          )}
        </YStack>
      </YStack>
    </StepLayout>
  )
}

// ── Toggle row component ──
function ToggleRow({
  label,
  subtitle,
  value,
  onValueChange,
}: {
  label: string
  subtitle?: string
  value: boolean
  onValueChange: (v: boolean) => void
}) {
  return (
    <XStack
      backgroundColor="#F0EDE5"
      borderRadius={8}
      height={subtitle ? 64 : 52}
      paddingHorizontal={16}
      alignItems="center"
      justifyContent="space-between"
    >
      <YStack flex={1}>
        <Text fontSize={15} fontWeight="600" color="#1F2723">
          {label}
        </Text>
        {subtitle && (
          <Text fontSize={12} color="#808868">
            {subtitle}
          </Text>
        )}
      </YStack>
      <Switch
        size="$3"
        checked={value}
        onCheckedChange={onValueChange}
        backgroundColor={value ? '#1F2723' : '#EAEAE4'}
      >
        <Switch.Thumb />
      </Switch>
    </XStack>
  )
}
