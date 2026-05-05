import { useState, useRef, useEffect } from 'react'
import { Pressable, TextInput, Alert, Animated, Linking, AppState, PanResponder } from 'react-native'
import { YStack, XStack, Text, View } from 'tamagui'
import { useRouter } from 'expo-router'
import { AppIcon } from '@/components/AppIcon'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'

import { StepLayout } from '@/components/booking/StepLayout'
import { useBookingRequest } from '@/lib/booking-context'

// ── Market price ranges (NT$, Taiwan averages) ──
const PRICE_RANGES: Record<string, { min: number; max: number }> = {
  凝膠: { min: 700, max: 1800 },
  卸甲: { min: 200, max: 500 },
  修補: { min: 150, max: 400 },
  保養: { min: 500, max: 1500 },
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


function computeMarketRange(services: {
  categoryIds: string[]
  styleId: string | null
  nailScope: string | null
  treatmentTier: string | null
  lashDensity: string | null
} | null): { min: number; max: number } | null {
  if (!services || services.categoryIds.length === 0) return null
  let min = 0, max = 0
  for (const s of services.categoryIds) {
    const r = PRICE_RANGES[s]
    if (r) { min += r.min; max += r.max }
  }
  if (min === 0) return null
  // Style / tier premium
  for (const key of [services.styleId, services.treatmentTier, services.lashDensity]) {
    const p = key ? STYLE_PREMIUM[key] : null
    if (p) { min += p.min; max += p.max }
  }
  // Scope multiplier (nails only)
  const m = services.nailScope ? (SCOPE_MULT[services.nailScope] ?? 1) : 1
  return {
    min: Math.round((min * m) / 100) * 100,
    max: Math.round((max * m) / 100) * 100,
  }
}

// ── Price range slider (two thumbs) ──
const THUMB = 28          // visual knob diameter
const HIT = 52            // gesture capture area (transparent, centered on knob)
const HIT_OFFSET = (HIT - THUMB) / 2  // 12 — shift wrapper left so knob stays visually aligned
const MIN_GAP = 4 // minimum px between thumb left edges

function PriceRangeSlider({
  min, max, lowValue, highValue, onLowChange, onHighChange,
}: {
  min: number; max: number
  lowValue: number; highValue: number
  onLowChange: (v: number) => void
  onHighChange: (v: number) => void
}) {
  // All state in refs — avoids stale closures inside PanResponder
  const trackWRef = useRef(0)
  const lowXRef = useRef(0)
  const highXRef = useRef(0)
  const lowStartX = useRef(0)
  const highStartX = useRef(0)
  // min/max stored in refs so PanResponder (created once) always reads current values
  const minRef = useRef(min)
  const maxRef = useRef(max)
  minRef.current = min
  maxRef.current = max
  // Independent Animated.Value per element — no Animated.add/subtract
  const lowAnim = useRef(new Animated.Value(0)).current
  const highAnim = useRef(new Animated.Value(0)).current
  const fillLeftAnim = useRef(new Animated.Value(THUMB / 2)).current
  const fillWidthAnim = useRef(new Animated.Value(0)).current

  function valueToX(v: number, usable: number) {
    return ((v - minRef.current) / (maxRef.current - minRef.current)) * usable
  }
  function xToValue(x: number, usable: number) {
    const lo = minRef.current, hi = maxRef.current
    return Math.round((lo + ((hi - lo) * x) / usable) / 100) * 100
  }
  function syncFill(lx: number, hx: number) {
    fillLeftAnim.setValue(lx + THUMB / 2)
    fillWidthAnim.setValue(Math.max(0, hx - lx))
  }
  function initPositions(trackW: number) {
    const usable = Math.max(1, trackW - THUMB)
    const lx = valueToX(lowValue, usable)
    const hx = valueToX(highValue, usable)
    lowXRef.current = lx
    highXRef.current = hx
    lowAnim.setValue(lx)
    highAnim.setValue(hx)
    syncFill(lx, hx)
  }

  const lowPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => { lowStartX.current = lowXRef.current },
      onPanResponderMove: (_, g) => {
        const usable = Math.max(1, trackWRef.current - THUMB)
        const x = Math.max(0, Math.min(highXRef.current - MIN_GAP, lowStartX.current + g.dx))
        lowXRef.current = x
        lowAnim.setValue(x)
        syncFill(x, highXRef.current)
        onLowChange(xToValue(x, usable))
      },
      onPanResponderRelease: (_, g) => {
        const usable = Math.max(1, trackWRef.current - THUMB)
        lowXRef.current = Math.max(0, Math.min(highXRef.current - MIN_GAP, lowStartX.current + g.dx))
        syncFill(lowXRef.current, highXRef.current)
        onLowChange(xToValue(lowXRef.current, usable))
      },
      onPanResponderTerminate: (_, g) => {
        const usable = Math.max(1, trackWRef.current - THUMB)
        lowXRef.current = Math.max(0, Math.min(highXRef.current - MIN_GAP, lowStartX.current + g.dx))
        syncFill(lowXRef.current, highXRef.current)
        onLowChange(xToValue(lowXRef.current, usable))
      },
    })
  ).current

  const highPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => { highStartX.current = highXRef.current },
      onPanResponderMove: (_, g) => {
        const usable = Math.max(1, trackWRef.current - THUMB)
        const x = Math.max(lowXRef.current + MIN_GAP, Math.min(usable, highStartX.current + g.dx))
        highXRef.current = x
        highAnim.setValue(x)
        syncFill(lowXRef.current, x)
        onHighChange(xToValue(x, usable))
      },
      onPanResponderRelease: (_, g) => {
        const usable = Math.max(1, trackWRef.current - THUMB)
        highXRef.current = Math.max(lowXRef.current + MIN_GAP, Math.min(usable, highStartX.current + g.dx))
        syncFill(lowXRef.current, highXRef.current)
        onHighChange(xToValue(highXRef.current, usable))
      },
      onPanResponderTerminate: (_, g) => {
        const usable = Math.max(1, trackWRef.current - THUMB)
        highXRef.current = Math.max(lowXRef.current + MIN_GAP, Math.min(usable, highStartX.current + g.dx))
        syncFill(lowXRef.current, highXRef.current)
        onHighChange(xToValue(highXRef.current, usable))
      },
    })
  ).current

  return (
    <View onLayout={e => {
      trackWRef.current = e.nativeEvent.layout.width
      initPositions(e.nativeEvent.layout.width)
    }}>
      {/* Track container — taller than knob to give full HIT touch area */}
      <View style={{ height: HIT }}>
        {/* Background track — vertically centered in HIT container */}
        <View style={{
          position: 'absolute',
          left: THUMB / 2, right: THUMB / 2,
          top: (HIT - 3) / 2,
          height: 3, backgroundColor: '#D8D9D2', borderRadius: 2,
        }} />
        {/* Active fill between thumbs */}
        <Animated.View style={{
          position: 'absolute',
          left: fillLeftAnim,
          width: fillWidthAnim,
          top: (HIT - 3) / 2,
          height: 3, backgroundColor: '#1F2723', borderRadius: 2,
        }} />
        {/* Low thumb — HIT-sized transparent gesture area, knob centered inside */}
        <Animated.View
          {...lowPan.panHandlers}
          style={{
            position: 'absolute',
            left: lowAnim,
            transform: [{ translateX: -HIT_OFFSET }],
            width: HIT, height: HIT,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <View style={{
            width: THUMB, height: THUMB, borderRadius: THUMB / 2,
            backgroundColor: '#1F2723',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 3,
          }} />
        </Animated.View>
        {/* High thumb — same pattern */}
        <Animated.View
          {...highPan.panHandlers}
          style={{
            position: 'absolute',
            left: highAnim,
            transform: [{ translateX: -HIT_OFFSET }],
            width: HIT, height: HIT,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <View style={{
            width: THUMB, height: THUMB, borderRadius: THUMB / 2,
            backgroundColor: '#1F2723',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 3,
          }} />
        </Animated.View>
      </View>
    </View>
  )
}

export default function ExtrasScreen() {
  const router = useRouter()
  const { state, dispatch } = useBookingRequest()

  const services = state.services?.categoryIds ?? []
  const category = state.category

  // ── Price range ──
  const marketRange = computeMarketRange(state.services)
  const [budgetLow, setBudgetLow] = useState<number>(() => marketRange?.min ?? 0)
  const [budgetHigh, setBudgetHigh] = useState<number>(() => marketRange?.max ?? 0)

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
              />
              {/* Market range — centered, below slider */}
              <XStack alignItems="center" justifyContent="center" gap={6}>
                <AppIcon name="price" size={12} color="#626765" />
                <Text fontSize={13} color="#626765" lineHeight={20}>
                  市場行情約 NT${marketRange.min.toLocaleString()}–{marketRange.max.toLocaleString()}
                </Text>
              </XStack>
            </YStack>
            <View height={1} backgroundColor="#D8D9D2" opacity={0.5} marginVertical={20} />
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
                borderColor="#D8D9D2"
                alignItems="center"
                justifyContent="center"
                gap={8}
              >
                <AppIcon
                  name="imageRef"
                  size={18}
                  color={photoDenied ? '#999992' : '#626765'}
                />
                <Text fontSize={15} color={photoDenied ? '#999992' : '#626765'}>
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
            placeholderTextColor="#626765"
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
            <Text fontSize={12} lineHeight={18} color="#626765">
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
