import { useState, useRef, useEffect } from 'react'
import { Pressable, TextInput, Animated, Linking, AppState } from 'react-native'
import { YStack, XStack, Text, View } from 'tamagui'
import { useRouter } from 'expo-router'
import { AppIcon } from '@/components/AppIcon'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'

import { StepLayout } from '@/components/booking/StepLayout'
import { PriceRangeSlider } from '@/components/booking/PriceRangeSlider'
import { useBookingRequest } from '@/lib/booking-context'

// ── Market price ranges (NT$, Taiwan averages) ──
const PRICE_RANGES: Record<string, { min: number; max: number }> = {
  凝膠: { min: 700, max: 1800 },
  卸甲: { min: 200, max: 500 },
  修補: { min: 150, max: 400 },
  保養: { min: 500, max: 1500 },
  矯正: { min: 800, max: 2000 },
  嫁接: { min: 800, max: 2500 },
  卸睫: { min: 200, max: 400 },
  睫毛管理: { min: 300, max: 800 },
}
const STYLE_PREMIUM: Record<string, { min: number; max: number }> = {
  設計款: { min: 200, max: 600 },
  貓眼: { min: 100, max: 300 },
  法式: { min: 100, max: 300 },
  漸層: { min: 150, max: 400 },
  鏡面: { min: 100, max: 300 },
  深層: { min: 200, max: 500 }, // treatmentTier
  妝感: { min: 100, max: 300 }, // lashDensity
  濃密: { min: 200, max: 500 }, // lashDensity
}
const SCOPE_MULT: Record<string, number> = { 手: 1, 腳: 0.8, '手+腳': 1.8 }


function computeScopeRange(
  categoryIds: string[],
  styleId: string | null,
  treatmentTier: string | null,
  lashDensity: string | null,
  mult: number,
): { min: number; max: number } | null {
  if (categoryIds.length === 0) return null
  let min = 0, max = 0
  for (const s of categoryIds) {
    const r = PRICE_RANGES[s]
    if (r) { min += r.min; max += r.max }
  }
  if (min === 0) return null
  for (const key of [styleId, treatmentTier, lashDensity]) {
    const p = key ? STYLE_PREMIUM[key] : null
    if (p) { min += p.min; max += p.max }
  }
  return {
    min: Math.round((min * mult) / 100) * 100,
    max: Math.round((max * mult) / 100) * 100,
  }
}

function computeMarketRange(services: {
  categoryIds: string[]
  styleId: string | null
  nailScope: string | null
  treatmentTier: string | null
  lashDensity: string | null
  handCategoryIds?: string[] | null
  handStyleId?: string | null
  handTreatmentTier?: string | null
  footCategoryIds?: string[] | null
  footStyleId?: string | null
  footTreatmentTier?: string | null
} | null): { min: number; max: number } | null {
  if (!services) return null
  // 手+腳 split: compute hand (×1.0) + foot (×0.8) separately
  if (services.handCategoryIds?.length && services.footCategoryIds?.length) {
    const handRange = computeScopeRange(services.handCategoryIds, services.handStyleId ?? null, services.handTreatmentTier ?? null, null, 1)
    const footRange = computeScopeRange(services.footCategoryIds, services.footStyleId ?? null, services.footTreatmentTier ?? null, null, 0.8)
    if (!handRange && !footRange) return null
    return {
      min: (handRange?.min ?? 0) + (footRange?.min ?? 0),
      max: (handRange?.max ?? 0) + (footRange?.max ?? 0),
    }
  }
  // Single scope
  const m = services.nailScope ? (SCOPE_MULT[services.nailScope] ?? 1) : 1
  return computeScopeRange(services.categoryIds, services.styleId, services.treatmentTier, services.lashDensity, m)
}

// PriceRangeSlider imported from @/components/booking/PriceRangeSlider

export default function ExtrasScreen() {
  const router = useRouter()
  const { state, dispatch } = useBookingRequest()

  const services = state.services?.categoryIds ?? []
  const category = state.category

  // ── Price range ──
  const marketRange = computeMarketRange(state.services)
  const [budgetLow, setBudgetLow] = useState<number>(() => marketRange?.min ?? 0)
  const [budgetHigh, setBudgetHigh] = useState<number>(() => marketRange?.max ?? 0)
  const [sliderActive, setSliderActive] = useState(false)

  // Add-on visibility
  const showNailAddon = category === 'nails'
  const showLashAddon =
    category === 'lashes' && (services.includes('嫁接') || services.includes('補睫'))

  // Nail add-on state
  const [extensionCount, setExtensionCount] = useState(() => {
    const existing = state.addons.find((a) => a.startsWith('延甲'))
    if (!existing) return 0
    const n = parseInt(existing.replace(/\D/g, ''), 10)
    return Number.isFinite(n) ? n : 0
  })
  const [minusFlash, setMinusFlash] = useState(false)
  const [plusFlash, setPlusFlash] = useState(false)
  const [fiberRepair, setFiberRepair] = useState(
    state.addons.includes('纖維補甲'),
  )
  const [baseThickening, setBaseThickening] = useState(
    state.addons.includes('底加厚'),
  )
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
    if (showNailAddon) {
      if (extensionCount > 0) addons.push(`延甲${extensionCount}隻`)
      if (fiberRepair) addons.push('纖維補甲')
      if (baseThickening) addons.push('底加厚')
    }
    if (showLashAddon && lowerLashAddon) addons.push('下睫毛')

    dispatch({ type: 'SET_ADDONS', payload: addons })
    dispatch({
      type: 'SET_EXTRAS',
      payload: {
        preferences: silentService ? ['靜默服務'] : [],
        customerNote: note,
        refPhotoUrl: photoUri,
        budgetRange: marketRange ? { min: budgetLow, max: budgetHigh } : null,
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
      scrollEnabled={!sliderActive}
    >
      <YStack flex={1} gap={0} paddingTop={16}>
        {/* Add-ons */}
        {(showNailAddon || showLashAddon) && (
          <YStack gap={12}>
            <Text fontSize={16} fontWeight="700" lineHeight={24} color="#1F2723">
              加購項目
            </Text>
            {showNailAddon && (
              <YStack gap={10}>
                {/* 延甲 — counter 0-10, 10隻 = 全延價格 */}
                <XStack
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
                      <AppIcon name="remove" size={13} color={minusFlash ? '#FBFBF8' : '#1F2723'} />
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
                      <AppIcon name="add" size={13} color={plusFlash ? '#FBFBF8' : '#1F2723'} />
                    </Pressable>
                  </XStack>
                </XStack>
                {/* 纖維補甲 */}
                <ToggleRow
                  label="纖維補甲"
                  value={fiberRepair}
                  onValueChange={setFiberRepair}
                />
                {/* 底加厚 */}
                <ToggleRow
                  label="底加厚"
                  value={baseThickening}
                  onValueChange={setBaseThickening}
                />
              </YStack>
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
          <View height={1} backgroundColor="#D2D3D3" opacity={0.5} marginVertical={20} />
        )}

        {/* Budget / price range */}
        {marketRange && (
          <>
            <YStack gap={12}>
              <Text fontSize={16} fontWeight="700" lineHeight={24} color="#1F2723">
                預算參考
              </Text>
              {/* User-selected budget — above slider, centered */}
              <Text fontSize={22} fontWeight="700" color="#1F2723" lineHeight={30} textAlign="center">
                NT${budgetLow.toLocaleString()}–{budgetHigh.toLocaleString()}
              </Text>
              <PriceRangeSlider
                min={0}
                max={marketRange.max + 1000}
                lowValue={budgetLow}
                highValue={budgetHigh}
                onLowChange={setBudgetLow}
                onHighChange={setBudgetHigh}
                onDragStart={() => setSliderActive(true)}
                onDragEnd={() => setSliderActive(false)}
              />
              {/* Market range — centered, below slider */}
              <XStack alignItems="center" justifyContent="center" gap={6}>
                <AppIcon name="price" size={12} color="#787D7B" />
                <Text fontSize={13} color="#787D7B" lineHeight={20}>
                  市場行情約 NT${marketRange.min.toLocaleString()}–{marketRange.max.toLocaleString()}
                </Text>
              </XStack>
            </YStack>
            <View height={1} backgroundColor="#D2D3D3" opacity={0.5} marginVertical={20} />
          </>
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

        <View height={1} backgroundColor="#D2D3D3" opacity={0.5} marginVertical={20} />

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
                <AppIcon name="close" size={11} color="#FBFBF8" />
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
                backgroundColor="rgba(216, 217, 210, 0.3)"
                borderRadius={8}
                height={56}
                borderWidth={1}
                borderStyle="dashed"
                borderColor="#D2D3D3"
                alignItems="center"
                justifyContent="center"
                gap={8}
              >
                <AppIcon
                  name="imageRef"
                  size={18}
                  color={photoDenied ? '#787D7B' : '#787D7B'}
                />
                <Text fontSize={15} color={photoDenied ? '#787D7B' : '#787D7B'}>
                  上傳圖片
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
            <Text fontSize={12} lineHeight={18} color="#787D7B">
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
