import { useState, useRef, useEffect } from 'react'
import { Pressable, TextInput, Alert, Animated, Linking, AppState } from 'react-native'
import { YStack, XStack, Text, View } from 'tamagui'
import { useRouter } from 'expo-router'
import { FA6ProIcon } from '@/components/FA6ProIcon'
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
  const [extensionCount, setExtensionCount] = useState(() => {
    const existing = state.addons.find((a) => a.startsWith('延甲') && a.endsWith('隻'))
    if (!existing) return 0
    const n = parseInt(existing.slice(2, -1), 10)
    return Number.isFinite(n) ? n : 0
  })
  const [minusFlash, setMinusFlash] = useState(false)
  const [plusFlash, setPlusFlash] = useState(false)
  const [lowerLashAddon, setLowerLashAddon] = useState(
    state.addons.includes('下睫毛'),
  )
  const [silentService, setSilentService] = useState(
    state.preferences.includes('靜默服務'),
  )
  const [note, setNote] = useState(state.customerNote)
  const [photoUri, setPhotoUri] = useState<string | null>(state.refPhotoUrl)
  const [photoDenied, setPhotoDenied] = useState(false)

  useEffect(() => {
    ImagePicker.getMediaLibraryPermissionsAsync().then(({ status }) => {
      setPhotoDenied(status === 'denied')
    })
    const sub = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
        setPhotoDenied(status === 'denied')
      }
    })
    return () => sub.remove()
  }, [])

  async function handlePickImage() {
    if (photoDenied) {
      Linking.openSettings()
      return
    }
    const { status } = await ImagePicker.getMediaLibraryPermissionsAsync()
    if (status === 'undetermined') {
      const { status: asked } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (asked !== 'granted') { setPhotoDenied(true); return }
    } else if (status !== 'granted') {
      setPhotoDenied(true)
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
    if (showNailAddon && extensionCount > 0) addons.push(`延甲${extensionCount}隻`)
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
    router.push('/book/searching')
  }

  return (
    <StepLayout
      title="其他需求"
      currentStep={5}
      totalSteps={6}
      onNext={handleConfirm}
      nextLabel="送出需求"
    >
      <YStack flex={1} gap={0} paddingTop={16}>
        {/* Add-ons */}
        {(showNailAddon || showLashAddon) && (
          <YStack gap={12}>
            <Text fontSize={16} fontWeight="700" lineHeight={24} color="#1F2723">
              加購項目
            </Text>
            {showNailAddon && (
              <XStack
                backgroundColor="#F0EDE5"
                borderRadius={8}
                height={52}
                paddingHorizontal={16}
                alignItems="center"
                justifyContent="space-between"
              >
                <Text fontSize={16} lineHeight={24} color="#1F2723">延甲</Text>
                <XStack alignItems="center" gap={16}>
                  <Pressable
                    onPress={() => {
                      setExtensionCount((c) => Math.max(0, c - 1))
                      setMinusFlash(true)
                      setTimeout(() => setMinusFlash(false), 200)
                    }}
                    disabled={extensionCount === 0}
                    accessibilityRole="button"
                    accessibilityLabel="減少延甲數量"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{
                      width: 32, height: 32, borderRadius: 16,
                      backgroundColor: minusFlash ? '#1F2723' : '#D8D9D2',
                      alignItems: 'center', justifyContent: 'center',
                      opacity: extensionCount === 0 ? 0.3 : 1,
                    }}
                  >
                    <FA6ProIcon name="minus" size={13} color={minusFlash ? '#FBFBF8' : '#1F2723'} />
                  </Pressable>
                  <Text fontSize={16} color="#1F2723" width={20} textAlign="center">
                    {extensionCount}
                  </Text>
                  <Pressable
                    onPress={() => {
                      setExtensionCount((c) => Math.min(10, c + 1))
                      setPlusFlash(true)
                      setTimeout(() => setPlusFlash(false), 200)
                    }}
                    disabled={extensionCount === 10}
                    accessibilityRole="button"
                    accessibilityLabel="增加延甲數量"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{
                      width: 32, height: 32, borderRadius: 16,
                      backgroundColor: plusFlash ? '#1F2723' : '#D8D9D2',
                      alignItems: 'center', justifyContent: 'center',
                      opacity: extensionCount === 10 ? 0.3 : 1,
                    }}
                  >
                    <FA6ProIcon name="plus" size={13} color={plusFlash ? '#FBFBF8' : '#1F2723'} />
                  </Pressable>
                </XStack>
              </XStack>
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

        {(showNailAddon || showLashAddon) && (
          <View height={1} backgroundColor="#D8D9D2" opacity={0.5} marginVertical={20} />
        )}

        {/* Preferences */}
        <YStack gap={12}>
          <Text fontSize={16} fontWeight="700" lineHeight={24} color="#1F2723">
            偏好設定
          </Text>
          <ToggleRow
            label="靜默服務"
            subtitle="服務過程中不聊天"
            value={silentService}
            onValueChange={setSilentService}
          />
        </YStack>

        <View height={1} backgroundColor="#D8D9D2" opacity={0.5} marginVertical={20} />

        {/* Reference photo */}
        <YStack gap={12}>
          <Text fontSize={16} fontWeight="700" lineHeight={24} color="#1F2723">
            參考圖片
          </Text>
          {photoUri ? (
            <View style={{ position: 'relative', alignSelf: 'flex-start' }}>
              <Image
                source={{ uri: photoUri }}
                style={{ width: 120, height: 120, borderRadius: 8 }}
                contentFit="cover"
                accessible={false}
              />
              <Pressable
                onPress={() => setPhotoUri(null)}
                accessibilityRole="button"
                accessibilityLabel="移除參考圖片"
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                style={({ pressed }) => ({
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: '#1F2723',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <FA6ProIcon name="xmark" size={11} color="#FBFBF8" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={handlePickImage}
              accessibilityRole="button"
              accessibilityLabel="上傳參考圖片"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <XStack
                backgroundColor="#EAEAE4"
                borderRadius={8}
                height={56}
                borderWidth={1}
                borderStyle="dashed"
                borderColor="#D8D9D2"
                alignItems="center"
                justifyContent="center"
                gap={8}
              >
                <FA6ProIcon
                  name="image-polaroid"
                  size={18}
                  color={photoDenied ? '#B0B0A8' : '#808868'}
                />
                <Text fontSize={15} color={photoDenied ? '#B0B0A8' : '#808868'}>
                  上傳圖片
                </Text>
              </XStack>
            </Pressable>
          )}
        </YStack>

        <View height={1} backgroundColor="#D8D9D2" opacity={0.5} marginVertical={20} />

        {/* Notes */}
        <YStack gap={12}>
          <Text fontSize={16} fontWeight="700" lineHeight={24} color="#1F2723">
            備註
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="有什麼想跟設計師說的嗎？"
            placeholderTextColor="#808868"
            multiline
            accessibilityLabel="備註"
            style={{
              backgroundColor: '#F0EDE5',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#D8D9D2',
              height: 100,
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 12,
              fontSize: 15,
              lineHeight: 22,
              color: '#1F2723',
              textAlignVertical: 'top',
            }}
          />
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
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start()
  }, [value])

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [3, 23] })
  const trackColor = anim.interpolate({ inputRange: [0, 1], outputRange: ['#D8D9D2', '#1F2723'] })

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={subtitle ? `${label}，${subtitle}` : label}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <XStack
        backgroundColor="#F0EDE5"
        borderRadius={8}
        height={subtitle ? 64 : 52}
        paddingHorizontal={16}
        alignItems="center"
        justifyContent="space-between"
      >
        <YStack flex={1}>
          <Text fontSize={16} lineHeight={24} color="#1F2723">
            {label}
          </Text>
          {subtitle && (
            <Text fontSize={12} lineHeight={18} color="#808868">
              {subtitle}
            </Text>
          )}
        </YStack>
        <Animated.View
          style={{
            width: 50,
            height: 30,
            borderRadius: 15,
            backgroundColor: trackColor,
            justifyContent: 'center',
          }}
        >
          <Animated.View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: 'white',
              transform: [{ translateX }],
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.15,
              shadowRadius: 2,
              elevation: 2,
            }}
          />
        </Animated.View>
      </XStack>
    </Pressable>
  )
}
