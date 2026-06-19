import { useState, useMemo } from 'react'
import { Pressable, Linking } from 'react-native'
import { YStack, XStack, Text, ScrollView, View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { AppIcon } from '@/components/AppIcon'
import { formatSlotTime, formatBookingDate } from '@/lib/booking-helpers'

type SlotItem = { id: string; startsAt: string; durationMinutes: number }

export default function ProBookingScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
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
    durationMinutes: string
    slots: string
    igHandle?: string
  }>()

  // Parse slots from JSON param
  const allSlots: SlotItem[] = useMemo(() => {
    try { return JSON.parse(params.slots || '[]') }
    catch { return [] }
  }, [params.slots])

  // Build date tabs from the selected date, showing 3 consecutive days
  const { dateTabs, slotsByDate } = useMemo(() => {
    const map = new Map<string, SlotItem[]>()
    for (const slot of allSlots) {
      const dateKey = slot.startsAt.slice(0, 10)
      const arr = map.get(dateKey) ?? []
      arr.push(slot)
      map.set(dateKey, arr)
    }

    // Start from the selected slot's date
    const selectedDateStr = params.startsAt?.slice(0, 10) ?? ''
    const [sy, sm, sd] = selectedDateStr.split('-').map(Number)
    const baseDate = (sy && sm && sd) ? new Date(sy, sm - 1, sd) : new Date()

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const days = [0, 1, 2].map(offset => {
      const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + offset)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

      // Label: 今天/明天 or weekday
      const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000)
      const label = diffDays === 0 ? '今天' : diffDays === 1 ? '明天' : `週${WEEKDAYS[d.getDay()]}`
      const subtitle = `${d.getMonth() + 1}/${d.getDate()}`
      return { key, label, subtitle }
    })

    return { dateTabs: days, slotsByDate: map }
  }, [allSlots, params.startsAt])

  // Initial date from the selected slot
  const initialDateKey = params.startsAt?.slice(0, 10) ?? dateTabs[0]?.key ?? ''

  // Local state for selected slot & active date tab
  const [selectedSlotId, setSelectedSlotId] = useState(params.slotId)
  const [noticeExpanded, setNoticeExpanded] = useState(false)
  const [selectedStartsAt, setSelectedStartsAt] = useState(params.startsAt)
  const [activeDateKey, setActiveDateKey] = useState(initialDateKey)

  const slotsForActiveDate = slotsByDate.get(activeDateKey) ?? []

  const selectedSlot = allSlots.find(s => s.id === selectedSlotId)
  const durationMinutes = selectedSlot?.durationMinutes ?? (Number(params.durationMinutes) || 60)

  function handleSelectSlot(slot: SlotItem) {
    setSelectedSlotId(slot.id)
    setSelectedStartsAt(slot.startsAt)
  }

  function handleContinue() {
    router.push({
      pathname: '/book/confirm',
      params: {
        slotId: selectedSlotId,
        proId: params.proId,
        startsAt: selectedStartsAt,
        proName: params.proName,
        priceMin: params.priceMin,
        priceMax: params.priceMax,
        studioAddress: params.studioAddress,
        studioName: params.studioName ?? '',
        lat: params.lat ?? '',
        lng: params.lng ?? '',
        durationMinutes: String(durationMinutes),
      },
    })
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
            <Text fontSize={16} fontWeight="600" color="#1F2723">預約資訊</Text>
          </View>
          <View width={44} />
        </XStack>
      </YStack>

      {/* Content */}
      <ScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 }}
      >
        {/* Pro profile */}
        <YStack alignItems="center" gap={8} paddingBottom={24}>
          <View
            width={80}
            height={80}
            borderRadius={40}
            backgroundColor="#E8E9E9"
            alignItems="center"
            justifyContent="center"
          >
            <AppIcon name="user" size={32} color="#787D7B" />
          </View>
          <Text fontSize={20} fontWeight="700" lineHeight={28} color="#1F2723">
            {params.proName}
          </Text>
        </YStack>

        {/* Portfolio header */}
        <XStack justifyContent="space-between" alignItems="center" marginBottom={12}>
          <Text fontSize={16} fontWeight="700" lineHeight={24} color="#1F2723">
            作品集
          </Text>
          {params.igHandle ? (
            <Pressable
              onPress={() => Linking.openURL(`https://instagram.com/${params.igHandle}`)}
              accessibilityRole="link"
              accessibilityLabel="IG作品"
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <XStack alignItems="center" gap={4}>
                <Text fontSize={14} lineHeight={20} color="#787D7B">IG作品</Text>
                <AppIcon name="externalLink" size={12} color="#787D7B" weight="regular" />
              </XStack>
            </Pressable>
          ) : null}
        </XStack>

        {/* Portfolio photos */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
          <XStack gap={8}>
            {PORTFOLIO_PHOTOS[params.proId]?.map((color, i) => (
              <View
                key={i}
                width={120}
                height={120}
                borderRadius={8}
                backgroundColor={color}
              />
            )) ?? (
              <View width={120} height={120} borderRadius={8} backgroundColor="#E8E9E9" />
            )}
          </XStack>
        </ScrollView>

        {/* 預約須知 section — collapsed: 3 lines, expanded: max 7 lines scrollable, collapsible */}
        <YStack marginBottom={24} gap={8}>
          <Text fontSize={16} fontWeight="700" lineHeight={24} color="#1F2723">
            預約須知
          </Text>
          {noticeExpanded ? (
            <ScrollView style={{ maxHeight: 7 * 22 }} nestedScrollEnabled>
              <Text fontSize={14} lineHeight={22} color="#787D7B">
                歡迎預約！以下幾點請留意：{'\n'}
                • 預約成功後，我會確認您的需求{'\n'}
                • 實際費用以現場確認為準{'\n'}
                • 確認預約後 10 分鐘內可免責取消{'\n'}
                • 請準時抵達，逾時 15 分鐘視為未到
              </Text>
            </ScrollView>
          ) : (
            <Text
              fontSize={14}
              lineHeight={22}
              color="#787D7B"
              numberOfLines={3}
            >
              歡迎預約！以下幾點請留意：{'\n'}
              • 預約成功後，我會確認您的需求{'\n'}
              • 實際費用以現場確認為準{'\n'}
              • 確認預約後 10 分鐘內可免責取消{'\n'}
              • 請準時抵達，逾時 15 分鐘視為未到
            </Text>
          )}
          <Pressable
            onPress={() => setNoticeExpanded(!noticeExpanded)}
            accessibilityRole="button"
            accessibilityLabel={noticeExpanded ? '收起' : '顯示更多'}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Text fontSize={14} lineHeight={20} color="#9A9B94">
              {noticeExpanded ? '收起' : '...更多'}
            </Text>
          </Pressable>
        </YStack>


        {/* 預約時間 section */}
        <YStack gap={20}>
          <Text fontSize={16} fontWeight="700" lineHeight={24} color="#1F2723">
            預約時間
          </Text>

          {/* Date tabs — underline style */}
          <XStack borderBottomWidth={2} borderBottomColor="#EBEBEF">
            {dateTabs.map((tab) => {
              const isActive = tab.key === activeDateKey
              const hasSlots = (slotsByDate.get(tab.key)?.length ?? 0) > 0
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveDateKey(tab.key)}
                  disabled={!hasSlots}
                  accessibilityRole="tab"
                  accessibilityLabel={`${tab.subtitle} ${tab.label}`}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingTop: 7,
                    paddingBottom: 13,
                    marginBottom: -2,
                    borderBottomWidth: 2,
                    borderBottomColor: isActive ? '#FF5A3C' : 'transparent',
                    opacity: hasSlots ? 1 : 0.35,
                  }}
                >
                  <Text
                    fontSize={18}
                    fontWeight="700"
                    lineHeight={26}
                    color={isActive ? '#1F2723' : '#9A9B94'}
                  >
                    {tab.subtitle}
                  </Text>
                  <Text
                    fontSize={12}
                    fontWeight="400"
                    lineHeight={18}
                    color={isActive ? '#1F2723' : '#9A9B94'}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              )
            })}
          </XStack>

          {/* Time slot grid — max 4 per row */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {slotsForActiveDate.map((slot) => {
              const isSelected = slot.id === selectedSlotId
              return (
                <Pressable
                  key={slot.id}
                  onPress={() => handleSelectSlot(slot)}
                  accessibilityRole="button"
                  accessibilityLabel={formatSlotTime(slot.startsAt)}
                  style={({ pressed }) => ({
                    width: '23.5%' as unknown as number,
                    backgroundColor: '#FBFBF8',
                    borderWidth: isSelected ? 1.5 : 1,
                    borderColor: isSelected ? '#FF5A3C' : '#E8E9E9',
                    borderRadius: 8,
                    paddingVertical: 7,
                    alignItems: 'center' as const,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text
                    fontSize={13}
                    lineHeight={20}
                    color="#1F2723"
                  >
                    {formatSlotTime(slot.startsAt)}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </YStack>
      </ScrollView>

      {/* Bottom CTA */}
      <XStack
        paddingHorizontal={16}
        paddingTop={10}
        paddingBottom={insets.bottom + 12}
        backgroundColor="#FBFBF8"
        alignItems="center"
      >
        <YStack flex={1} marginRight={12} paddingLeft={8}>
          <Text fontSize={16} fontWeight="600" lineHeight={22} color="#1F2723">
            {selectedStartsAt ? formatSlotTime(selectedStartsAt) : ''}
          </Text>
          <Text fontSize={14} lineHeight={20} color="#8F9391">
            {selectedStartsAt ? formatBookingDate(selectedStartsAt) : ''}
          </Text>
        </YStack>
        <Pressable
          onPress={handleContinue}
          accessibilityRole="button"
          accessibilityLabel="繼續"
          style={({ pressed }) => ({
            borderRadius: 9999,
            height: 48,
            flex: 1,
            backgroundColor: '#1F2723',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <Text fontSize={16} fontWeight="600" color="#FBFBF8">繼續</Text>
        </Pressable>
      </XStack>
    </YStack>
  )
}

// ── Constants ──

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

const PORTFOLIO_PHOTOS: Record<string, string[]> = {
  '1': ['#7E334B', '#4B7E33', '#334B7E'],
  '2': ['#7E5A33', '#337E5A'],
  '3': ['#5A337E', '#7E3363', '#33707E', '#707E33'],
  '4': ['#337E70'],
}

// ── Helper components ──


