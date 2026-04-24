import { useState, useEffect, useCallback } from 'react'
import { Pressable, FlatList, Alert } from 'react-native'
import { YStack, XStack, Text, View, Spinner } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { FA6ProIcon } from '@/components/FA6ProIcon'

import { useBookingRequest } from '@/lib/booking-context'
import { apiPost } from '@/lib/api'
import { buildRequestSummary, formatSlotTime } from '@/lib/booking-helpers'

// ── Types ──

type SlotItem = { id: string; startsAt: string; durationMinutes: number }

type ProResult = {
  pro: { id: string; displayName: string; district?: string }
  slots: SlotItem[]
  priceRange: { min: number; max: number }
  distanceKm?: number
}

type MatchResponse = { results: ProResult[]; total: number }

type SelectedSlot = {
  slotId: string
  proId: string
  startsAt: string
  proName: string
  priceMin: number
  priceMax: number
  studioAddress?: string
}

// ── Screen ──

export default function SlotsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { state } = useBookingRequest()

  const [status, setStatus] = useState<'loading' | 'results' | 'empty' | 'error'>('loading')
  const [results, setResults] = useState<ProResult[]>([])
  const [selected, setSelected] = useState<SelectedSlot | null>(null)

  const summary = buildRequestSummary(state)

  const fetchSlots = useCallback(async () => {
    setStatus('loading')
    try {
      // TODO: Auth session must be configured for this API call to work.
      const body: Record<string, unknown> = {}
      if (state.category && state.category !== 'makeup') body.domain = state.category
      if (state.services?.categoryIds?.length) body.categoryIds = state.services.categoryIds
      if (state.date) body.dates = [state.date]
      if (state.timeBand) body.timeBand = state.timeBand
      if (state.location) {
        body.lat = state.location.lat
        body.lng = state.location.lng
      }

      const data = await apiPost<MatchResponse>('/api/bookings/match', body)
      if (data.results.length === 0) {
        setStatus('empty')
      } else {
        setResults(data.results)
        setStatus('results')
      }
    } catch {
      setStatus('error')
    }
  }, [state])

  useEffect(() => { fetchSlots() }, [fetchSlots])

  function selectSlot(proResult: ProResult, slot: SlotItem) {
    setSelected({
      slotId: slot.id,
      proId: proResult.pro.id,
      startsAt: slot.startsAt,
      proName: proResult.pro.displayName,
      priceMin: proResult.priceRange.min,
      priceMax: proResult.priceRange.max,
    })
  }

  function handleConfirm() {
    if (!selected) return
    router.push({
      pathname: '/book/confirm',
      params: {
        slotId: selected.slotId,
        proId: selected.proId,
        startsAt: selected.startsAt,
        proName: selected.proName,
        priceMin: String(selected.priceMin),
        priceMax: String(selected.priceMax),
        studioAddress: selected.studioAddress ?? '',
      },
    })
  }

  // ── Header ──
  const header = (
    <YStack paddingTop={insets.top} backgroundColor="#FBFBF8">
      <XStack height={48} alignItems="center" paddingHorizontal={16}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          accessibilityRole="button"
          accessibilityLabel="返回"
        >
          <FA6ProIcon name="chevron-left" size={20} color="#1F2723" />
        </Pressable>
        <View flex={1} alignItems="center">
          <Text fontSize={16} fontWeight="600" color="#1F2723">可預約時段</Text>
        </View>
        <View width={44} />
      </XStack>
      <Text fontSize={13} color="#858279" textAlign="center" paddingHorizontal={16} paddingBottom={12}>
        {summary}
      </Text>
    </YStack>
  )

  // ── Loading state ──
  if (status === 'loading') {
    return (
      <YStack flex={1} backgroundColor="#FBFBF8">
        {header}
        <YStack flex={1} paddingHorizontal={16} paddingTop={16} gap={12}>
          <Spinner size="large" color="#1F2723" />
          {[1, 2, 3].map((i) => (
            <View key={i} backgroundColor="#F0EDE5" borderRadius={12} height={100} />
          ))}
        </YStack>
      </YStack>
    )
  }

  // ── Empty state ──
  if (status === 'empty') {
    return (
      <YStack flex={1} backgroundColor="#FBFBF8">
        {header}
        <YStack flex={1} justifyContent="center" alignItems="center" gap={16} paddingHorizontal={32}>
          <Text fontSize={18} fontWeight="600" lineHeight={26} color="#1F2723">
            目前沒有符合條件的時段
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={{
              borderRadius: 9999,
              height: 48,
              paddingHorizontal: 24,
              backgroundColor: '#1F2723',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text fontSize={16} fontWeight="600" color="#FBFBF8">修改需求</Text>
          </Pressable>
        </YStack>
      </YStack>
    )
  }

  // ── Error state ──
  if (status === 'error') {
    return (
      <YStack flex={1} backgroundColor="#FBFBF8">
        {header}
        <YStack flex={1} justifyContent="center" alignItems="center" gap={16} paddingHorizontal={32}>
          <Text fontSize={18} fontWeight="600" lineHeight={26} color="#1F2723">載入失敗</Text>
          <Pressable
            onPress={fetchSlots}
            style={{
              borderRadius: 9999,
              height: 48,
              paddingHorizontal: 24,
              backgroundColor: '#1F2723',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text fontSize={16} fontWeight="600" color="#FBFBF8">重試</Text>
          </Pressable>
        </YStack>
      </YStack>
    )
  }

  // ── Results state ──
  return (
    <YStack flex={1} backgroundColor="#FBFBF8">
      {header}

      <FlatList
        data={results}
        keyExtractor={(item) => item.pro.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        renderItem={({ item: proResult }) => (
          <YStack backgroundColor="#F0EDE5" borderRadius={8} padding={16} marginBottom={12} gap={10}>
            {/* Pro header */}
            <XStack justifyContent="space-between" alignItems="center">
              <YStack gap={2}>
                <Text fontSize={16} fontWeight="700" color="#1F2723">
                  {proResult.pro.displayName}
                </Text>
                <XStack gap={6} alignItems="center">
                  {proResult.pro.district && (
                    <Text fontSize={13} color="#858279">{proResult.pro.district}</Text>
                  )}
                  {proResult.distanceKm != null && (
                    <Text fontSize={13} color="#858279">{proResult.distanceKm.toFixed(1)} km</Text>
                  )}
                </XStack>
              </YStack>
              <Text fontSize={15} fontWeight="600" color="#1F2723">
                NT${proResult.priceRange.min}起
              </Text>
            </XStack>

            {/* Slot chips */}
            <XStack flexWrap="wrap" gap={8}>
              {proResult.slots.map((slot) => {
                const isSelected = selected?.slotId === slot.id
                return (
                  <Pressable
                    key={slot.id}
                    onPress={() => selectSlot(proResult, slot)}
                    accessibilityRole="button"
                    accessibilityLabel={formatSlotTime(slot.startsAt)}
                    accessibilityState={{ selected: isSelected }}
                    style={({ pressed }) => ({
                      width: 64,
                      height: 44,
                      borderRadius: 9999,
                      backgroundColor: isSelected ? '#1F2723' : '#EAEAE4',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text
                      fontSize={14}
                      fontWeight="600"
                      color={isSelected ? '#FBFBF8' : '#1F2723'}
                    >
                      {formatSlotTime(slot.startsAt)}
                    </Text>
                  </Pressable>
                )
              })}
            </XStack>
          </YStack>
        )}
      />

      {/* Bottom CTA */}
      <YStack
        paddingHorizontal={16}
        paddingTop={12}
        paddingBottom={insets.bottom + 12}
        backgroundColor="#FBFBF8"
      >
        <Pressable
          onPress={handleConfirm}
          disabled={!selected}
          accessibilityRole="button"
          accessibilityLabel="選擇此時段"
          style={({ pressed }) => ({
            borderRadius: 9999,
            height: 48,
            backgroundColor: '#1F2723',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: !selected ? 0.4 : pressed ? 0.75 : 1,
          })}
        >
          <Text fontSize={16} fontWeight="600" color="#FBFBF8">選擇此時段</Text>
        </Pressable>
      </YStack>
    </YStack>
  )
}
