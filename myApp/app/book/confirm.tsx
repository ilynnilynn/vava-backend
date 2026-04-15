import { useState } from 'react'
import { Pressable, Alert } from 'react-native'
import { YStack, XStack, Text, ScrollView, View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'

import { useBookingRequest } from '@/lib/booking-context'
import { apiPost } from '@/lib/api'
import { formatBookingDate, formatSlotTime } from '@/lib/booking-helpers'

export default function ConfirmScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { state } = useBookingRequest()

  const params = useLocalSearchParams<{
    slotId: string
    proId: string
    startsAt: string
    proName: string
    priceMin: string
    priceMax: string
    studioAddress: string
  }>()

  const [submitting, setSubmitting] = useState(false)

  // Build display strings
  const categoryLabel = state.category === 'nails' ? '美甲' : state.category === 'lashes' ? '美睫' : '彩妝'
  const serviceLabel = state.services?.categoryIds?.length
    ? state.services.categoryIds.join('・')
    : ''
  const dateLabel = params.startsAt ? formatBookingDate(params.startsAt) : ''
  const timeLabel = params.startsAt ? formatSlotTime(params.startsAt) : ''
  const priceMin = params.priceMin ? Number(params.priceMin) : 0

  async function handleConfirm() {
    setSubmitting(true)
    try {
      // TODO: Auth session must be configured for this API call to work.
      await apiPost('/api/bookings/confirm', {
        proId: params.proId,
        slotId: params.slotId,
        startsAt: params.startsAt,
        durationMinutes: 60,
        noShowWindowMinutes: 15,
        priceMin: Number(params.priceMin),
        priceMax: Number(params.priceMax),
        serviceCategoryIds: state.services?.categoryIds ?? [],
      })
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
            accessibilityLabel="返回"
          >
            <ChevronLeft size={24} color="#1F2723" />
          </Pressable>
          <View flex={1} alignItems="center">
            <Text fontSize={16} fontWeight="600" color="#1F2723">確認預約</Text>
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
        <YStack backgroundColor="#F0EDE5" borderRadius={12} padding={20} gap={16}>
          {/* Pro name */}
          <Text fontSize={22} fontWeight="700" color="#1F2723">
            {params.proName}
          </Text>

          {/* Service */}
          <InfoRow label="服務" value={[categoryLabel, serviceLabel].filter(Boolean).join(' - ')} />

          {/* Date & time */}
          <InfoRow label="日期" value={dateLabel} />
          <InfoRow label="時間" value={timeLabel} />

          {/* Price */}
          <InfoRow label="參考價格" value={`NT$${priceMin}起`} />

          {/* Studio address */}
          {params.studioAddress ? (
            <InfoRow label="地點" value={params.studioAddress} />
          ) : null}
        </YStack>

        {/* Payment note */}
        <Text fontSize={13} color="#808868" paddingTop={16} lineHeight={20}>
          實際費用將於服務結束後由設計師確認
        </Text>
      </ScrollView>

      {/* Bottom CTA */}
      <YStack
        paddingHorizontal={16}
        paddingTop={12}
        paddingBottom={insets.bottom + 12}
        backgroundColor="#FBFBF8"
      >
        <Pressable
          onPress={handleConfirm}
          disabled={submitting}
          style={{
            borderRadius: 9999,
            height: 44,
            backgroundColor: '#1F2723',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: submitting ? 0.4 : 1,
          }}
        >
          <Text fontSize={16} fontWeight="600" color="#FBFBF8">
            {submitting ? '預約中...' : '確認預約'}
          </Text>
        </Pressable>
      </YStack>
    </YStack>
  )
}

// ── Helper component ──

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <XStack justifyContent="space-between" alignItems="flex-start">
      <Text fontSize={14} color="#808868" width={80}>{label}</Text>
      <Text fontSize={15} fontWeight="600" color="#1F2723" flex={1} textAlign="right">
        {value}
      </Text>
    </XStack>
  )
}
