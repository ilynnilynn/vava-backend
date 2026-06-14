import { useState } from 'react'
import { Pressable, Alert, TextInput, Linking, Platform, Image } from 'react-native'
import { YStack, XStack, Text, ScrollView, View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useBookingRequest } from '@/lib/booking-context'
import { AppIcon } from '@/components/AppIcon'
import { apiPost } from '@/lib/api'
import { formatBookingDate, formatSlotTime, filterDisplayCats, buildScopeServiceLines } from '@/lib/booking-helpers'

export default function ConfirmScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { state, dispatch } = useBookingRequest()

  const params = useLocalSearchParams<{
    slotId: string
    proId: string
    startsAt: string
    proName: string
    priceMin: string
    priceMax: string
    studioAddress: string
    studioName?: string
    lat?: string
    lng?: string
    durationMinutes?: string
  }>()

  const [submitting, setSubmitting] = useState(false)
  const [editableNote, setEditableNote] = useState(state.customerNote)
  const [serviceExpanded, setServiceExpanded] = useState(false)

  // ── Derived values ──
  const durationMinutes = params.durationMinutes ? Number(params.durationMinutes) : 60
  const dateLabel = params.startsAt ? formatBookingDate(params.startsAt) : ''
  const timeStart = params.startsAt ? formatSlotTime(params.startsAt) : ''
  const priceMin = params.priceMin ? Number(params.priceMin) : 0

  // Static map
  const MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
  const hasCoords = params.lat && params.lng
  const staticMapUrl = hasCoords
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${params.lat},${params.lng}&zoom=15&size=600x200&scale=2&markers=color:red%7C${params.lat},${params.lng}&key=${MAPS_KEY}`
    : ''

  // End time
  const timeEnd = params.startsAt
    ? formatSlotTime(new Date(new Date(params.startsAt).getTime() + durationMinutes * 60000).toISOString())
    : ''

  // Service lines with per-item prices
  type ServiceLine = { label: string; price: string; priceNum: number }
  const serviceItems: ServiceLine[] = []
  const categoryLabel = state.category === 'nails' ? '美甲' : state.category === 'lashes' ? '美睫' : '彩妝'

  const ITEM_PRICES: Record<string, number> = {
    凝膠: 700, 卸甲: 200, 修補: 150, 保養: 500, 矯正: 800,
    嫁接: 800, 卸睫: 200, 睫毛管理: 300,
  }

  const confirmScopeLines = buildScopeServiceLines(state.services)
  if (confirmScopeLines.length) {
    confirmScopeLines.forEach(line => serviceItems.push({ label: line, price: '', priceNum: 0 }))
  } else {
    const displayCategoryIds = filterDisplayCats(
      state.services?.categoryIds ?? [],
      { removalType: state.services?.removalType, treatmentTier: state.services?.treatmentTier },
    )
    const mainParts: string[] = []
    if (state.services?.nailScope) mainParts.push(state.services.nailScope.replace('+', '＋'))
    if (state.services?.styleId) mainParts.push(state.services.styleId)
    if (displayCategoryIds.length) mainParts.push(displayCategoryIds[0])
    if (state.services?.lashDensity) mainParts.push(state.services.lashDensity)

    // First main service line — look up price from first category
    const firstCat = (state.services?.categoryIds ?? [])[0]
    const mainPriceNum = firstCat && ITEM_PRICES[firstCat] ? ITEM_PRICES[firstCat] : 0
    if (mainParts.length) serviceItems.push({ label: mainParts.join(' '), price: mainPriceNum ? `NT$${mainPriceNum}` : '', priceNum: mainPriceNum })
    else serviceItems.push({ label: categoryLabel, price: mainPriceNum ? `NT$${mainPriceNum}` : '', priceNum: mainPriceNum })

    if (displayCategoryIds.length > 1) {
      displayCategoryIds.slice(1).forEach(id => {
        const p = ITEM_PRICES[id] ?? 0
        serviceItems.push({ label: id, price: p ? `NT$${p}` : '', priceNum: p })
      })
    }
    if (state.services?.treatmentTier) {
      const scope = state.services.nailScope?.replace('+', '＋') ?? ''
      const p = ITEM_PRICES['保養'] ?? 0
      serviceItems.push({ label: [scope, state.services.treatmentTier, '保養'].filter(Boolean).join(' '), price: p ? `NT$${p}` : '', priceNum: p })
    }
    if (state.services?.removalType) {
      const p = ITEM_PRICES['卸甲'] ?? 0
      serviceItems.push({ label: `卸甲（${state.services.removalType}）`, price: p ? `NT$${p}` : '', priceNum: p })
    }
  }
  if (state.services?.fiberTagId) serviceItems.push({ label: state.services.fiberTagId, price: '', priceNum: 0 })
  if (state.services?.fillInDays != null) serviceItems.push({ label: `補色 ${state.services.fillInDays} 天`, price: '', priceNum: 0 })
  if (state.addons?.length) state.addons.forEach(a => serviceItems.push({ label: a, price: '', priceNum: 0 }))

  // Sum from item prices; fall back to params.priceMin if no items have prices
  const computedTotal = serviceItems.reduce((sum, item) => sum + item.priceNum, 0)
  const totalPrice = computedTotal > 0 ? computedTotal : priceMin

  // ── Open maps ──
  function openMaps() {
    const addr = encodeURIComponent(params.studioAddress || '')
    if (!addr) return
    const url = Platform.OS === 'ios'
      ? `maps:?address=${addr}`
      : `geo:0,0?q=${addr}`
    Linking.openURL(url)
  }

  // ── Confirm ──
  async function handleConfirm() {
    if (editableNote !== state.customerNote) {
      dispatch({
        type: 'SET_EXTRAS',
        payload: {
          preferences: state.preferences,
          customerNote: editableNote,
          refPhotoUrl: state.refPhotoUrl,
          budgetRange: state.budgetRange,
        },
      })
    }
    setSubmitting(true)
    try {
      if (!__DEV__) {
        await apiPost('/api/bookings/confirm', {
          proId: params.proId,
          slotId: params.slotId,
          startsAt: params.startsAt,
          durationMinutes,
          noShowWindowMinutes: 15,
          priceMin: Number(params.priceMin),
          priceMax: Number(params.priceMax),
          serviceCategoryIds: state.services?.categoryIds ?? [],
          nailScope: state.services?.nailScope ?? undefined,
          handCategoryIds: state.services?.handCategoryIds ?? undefined,
          handStyleId: state.services?.handStyleId ?? undefined,
          handTreatmentTier: state.services?.handTreatmentTier ?? undefined,
          footCategoryIds: state.services?.footCategoryIds ?? undefined,
          footStyleId: state.services?.footStyleId ?? undefined,
          footTreatmentTier: state.services?.footTreatmentTier ?? undefined,
        })
      }
      router.push({
        pathname: '/book/success',
        params: {
          proName: params.proName,
          startsAt: params.startsAt,
          studioAddress: params.studioAddress,
        },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : '預約失敗'
      if (message.includes('slot taken') || message.includes('已被預約')) {
        Alert.alert('此時段已被預約', '請回到上一頁選擇其他時段', [
          { text: '返回選擇', onPress: () => router.back() },
        ])
      } else {
        Alert.alert('預約失敗', message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <YStack flex={1} backgroundColor="#FBFBF8">
      {/* Header */}
      <YStack paddingTop={insets.top}>
        <XStack height={48} alignItems="center" paddingHorizontal={16}>
          <Pressable
            onPress={() => router.back()}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            accessibilityRole="button"
            accessibilityLabel="返回"
          >
            <AppIcon name="back" size={20} color="#1F2723" />
          </Pressable>
          <View flex={1} alignItems="center">
            <Text fontSize={16} fontWeight="600" color="#1F2723">確認預約</Text>
          </View>
          <View width={44} />
        </XStack>
      </YStack>

      {/* Scrollable content */}
      <ScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 }}
      >
        {/* ── Booking summary card ── */}
        <YStack backgroundColor="#F6F4EF" borderRadius={12} padding={20}>
          {/* 1. Pro */}
          <XStack alignItems="center" gap={12} paddingBottom={16}>
            <View
              width={48}
              height={48}
              borderRadius={24}
              backgroundColor="#E8E9E9"
              alignItems="center"
              justifyContent="center"
            >
              <AppIcon name="user" size={20} color="#787D7B" />
            </View>
            <Text fontSize={18} fontWeight="700" lineHeight={26} color="#1F2723">
              {params.proName}
            </Text>
          </XStack>

          <CardDivider />

          {/* 2. Location — map thumbnail + studio info */}
          <Pressable
            onPress={openMaps}
            disabled={!params.studioAddress}
            accessibilityRole="link"
            accessibilityLabel="在地圖中打開"
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <XStack paddingVertical={16} gap={12} alignItems="center">
              {staticMapUrl ? (
                <View width={55} height={55} borderRadius={8} overflow="hidden" flexShrink={0}>
                  <Image
                    source={{ uri: staticMapUrl }}
                    style={{ width: 55, height: 55 }}
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <View width={55} height={55} borderRadius={8} backgroundColor="#E8E9E9" alignItems="center" justifyContent="center" flexShrink={0}>
                  <AppIcon name="location" size={24} color="#787D7B" />
                </View>
              )}
              <YStack flex={1} gap={4}>
                <Text fontSize={16} fontWeight="600" lineHeight={24} color="#1F2723">
                  {params.studioName || params.proName}
                </Text>
                <Text fontSize={14} lineHeight={20} color="#787D7B" numberOfLines={2}>
                  {params.studioAddress || '確認後由設計師提供'}
                </Text>
              </YStack>
            </XStack>
          </Pressable>

          {/* 3. Date / Time — grey text with icons */}
          <YStack paddingVertical={16} gap={12}>
            <XStack alignItems="center" gap={12}>
              <View width={20} height={20} alignItems="center" justifyContent="center">
                <AppIcon name="calendar" size={16} color="#787D7B" weight="regular" />
              </View>
              <Text fontSize={14} lineHeight={20} color="#787D7B">{dateLabel}</Text>
            </XStack>
            <XStack alignItems="center" gap={12}>
              <View width={20} height={20} alignItems="center" justifyContent="center">
                <AppIcon name="time" size={16} color="#787D7B" weight="regular" />
              </View>
              <Text fontSize={14} lineHeight={20} color="#787D7B">
                {timeStart} – {timeEnd}（{durationMinutes} 分鐘）
              </Text>
            </XStack>
          </YStack>

          {/* 5. Services */}
          <YStack paddingVertical={16} gap={8}>
            {serviceItems.map((item, i) => (
              i === 0 ? (
                <YStack key={i} gap={8}>
                  <Pressable
                    onPress={() => setServiceExpanded(!serviceExpanded)}
                    accessibilityRole="button"
                    accessibilityLabel={serviceExpanded ? '收起服務流程' : '展開服務流程'}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                  >
                    <XStack justifyContent="space-between" alignItems="center">
                      <XStack alignItems="center" gap={6} flex={1}>
                        <Text fontSize={15} lineHeight={22} color="#1F2723">{item.label}</Text>
                        <AppIcon
                          name={serviceExpanded ? 'chevronDown' : 'forward'}
                          size={12}
                          color="#787D7B"
                        />
                      </XStack>
                      {item.price ? (
                        <Text fontSize={15} lineHeight={22} color="#787D7B">{item.price}</Text>
                      ) : null}
                    </XStack>
                  </Pressable>
                  {serviceExpanded && (
                    <Text fontSize={13} lineHeight={18} color="#787D7B">
                      {(SERVICE_PROCESS[state.category ?? 'nails'] ?? SERVICE_PROCESS.nails).join(' > ')}
                    </Text>
                  )}
                </YStack>
              ) : (
                <XStack key={i} justifyContent="space-between" alignItems="center">
                  <Text fontSize={15} lineHeight={22} color="#1F2723">{item.label}</Text>
                  {item.price ? (
                    <Text fontSize={15} lineHeight={22} color="#787D7B">{item.price}</Text>
                  ) : null}
                </XStack>
              )
            ))}
            <Text fontSize={13} lineHeight={18} color="#787D7B" marginTop={-4}>
              {durationMinutes} 分鐘
            </Text>
          </YStack>

          <CardDivider />

          {/* 6. Total */}
          <XStack justifyContent="space-between" alignItems="center" paddingTop={16}>
            <Text fontSize={16} fontWeight="700" lineHeight={24} color="#1F2723">合計</Text>
            <Text fontSize={16} fontWeight="700" lineHeight={24} color="#1F2723">
              NT${totalPrice} 起
            </Text>
          </XStack>
          <Text fontSize={13} lineHeight={18} color="#787D7B" paddingTop={4} textAlign="right">
            金額以實際消費項目為主
          </Text>
        </YStack>

        {/* ── 7. Cancellation Policy ── */}
        <YStack paddingVertical={16} gap={8}>
          <Text fontSize={15} fontWeight="600" lineHeight={22} color="#1F2723" paddingBottom={4}>
            取消政策
          </Text>
          <YStack backgroundColor="#F6F4EF" borderRadius={8} padding={16} gap={10}>
            <YStack gap={2}>
              <XStack alignItems="center" gap={12}>
                <View width={20} height={20} alignItems="center" justifyContent="center">
                  <AppIcon name="shieldCheck" size={16} color="#33CC87" />
                </View>
                <Text fontSize={14} fontWeight="600" lineHeight={20} color="#1F2723">免責取消</Text>
              </XStack>
              <Text fontSize={13} lineHeight={18} color="#787D7B" marginLeft={32}>預約確認後 10 分鐘內可免責取消</Text>
            </YStack>
            <YStack gap={2}>
              <XStack alignItems="center" gap={12}>
                <View width={20} height={20} alignItems="center" justifyContent="center">
                  <AppIcon name="alarmExclamation" size={16} color="#1F2723" weight="regular" />
                </View>
                <Text fontSize={14} fontWeight="600" lineHeight={20} color="#1F2723">逾時取消</Text>
              </XStack>
              <Text fontSize={13} lineHeight={18} color="#787D7B" marginLeft={32}>超過免責取消時間後取消，可能影響未來預約權益</Text>
            </YStack>
            <YStack gap={2}>
              <XStack alignItems="center" gap={12}>
                <View width={20} height={20} alignItems="center" justifyContent="center">
                  <AppIcon name="calendarCancel" size={16} color="#1F2723" weight="regular" />
                </View>
                <Text fontSize={14} fontWeight="600" lineHeight={20} color="#1F2723">放鳥政策</Text>
              </XStack>
              <Text fontSize={13} lineHeight={18} color="#787D7B" marginLeft={32}>未通知且逾時 15 分鐘未到場，視為放鳥。放鳥兩次帳號將視為警示帳號。</Text>
            </YStack>
          </YStack>
        </YStack>

        {/* ── 8. Notes ── */}
        <YStack paddingVertical={16} gap={8}>
          <Text fontSize={15} fontWeight="600" lineHeight={22} color="#1F2723">
            備註
          </Text>
          <TextInput
            value={editableNote}
            onChangeText={setEditableNote}
            placeholder="想讓設計師知道的事？&#10;例如：偏好甲型、設計參考、過敏資訊"
            placeholderTextColor="#9A9B94"
            multiline
            accessibilityLabel="備註"
            style={{
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#D2D3D3',
              minHeight: 100,
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
      </ScrollView>

      {/* ── 9. Bottom CTA ── */}
      <XStack
        paddingHorizontal={16}
        paddingTop={10}
        paddingBottom={insets.bottom + 12}
        backgroundColor="#FBFBF8"
        alignItems="center"
      >
        <YStack flex={1} marginRight={12} paddingLeft={8}>
          <Text fontSize={16} fontWeight="600" lineHeight={22} color="#1F2723">
            NT$ {priceMin.toLocaleString()}
          </Text>
          <Text fontSize={14} lineHeight={20} color="#8F9391">
            {durationMinutes} 分鐘
          </Text>
        </YStack>
        <Pressable
          onPress={handleConfirm}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel="確認預約"
          style={({ pressed }) => ({
            borderRadius: 9999,
            height: 48,
            flex: 1,
            backgroundColor: '#1F2723',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: submitting ? 0.4 : pressed ? 0.75 : 1,
          })}
        >
          <Text fontSize={16} fontWeight="600" color="#FBFBF8">
            {submitting ? '預約中...' : '預約完成'}
          </Text>
        </Pressable>
      </XStack>
    </YStack>
  )
}

// ── Constants ──

const SERVICE_PROCESS: Record<string, string[]> = {
  nails:  ['基礎保養', '上色／凝膠', '清潔整理', '護甲油'],
  lashes: ['卸妝清潔', '隔離膠帶', '嫁接／燙睫', '定型檢查'],
  makeup: ['底妝打底', '眼妝／修容', '唇妝定妝', '最終確認'],
}

// ── Helper components ──

function Divider() {
  return <View height={1} backgroundColor="#EBEBEF" />
}

function CardDivider() {
  return <View height={1} backgroundColor="#E8E9E9" />
}

function PolicyItem({ label, text }: { label: string; text: string }) {
  return (
    <YStack gap={2}>
      <Text fontSize={14} fontWeight="600" lineHeight={20} color="#1F2723">{label}</Text>
      <Text fontSize={13} lineHeight={18} color="#787D7B">{text}</Text>
    </YStack>
  )
}
