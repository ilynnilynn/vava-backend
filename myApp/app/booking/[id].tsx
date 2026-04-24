import { useState, useCallback } from 'react'
import { Pressable, ActivityIndicator, Alert } from 'react-native'
import { YStack, XStack, Text, ScrollView, View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { FA6ProIcon } from '@/components/FA6ProIcon'

import { StatusBadge } from '@/components/booking/StatusBadge'
import { fetchBookingDetail } from '@/lib/bookings-api'
import { formatBookingDate, formatSlotTime } from '@/lib/booking-helpers'
import type { BookingDetail } from '@/types/booking-list'

export default function BookingDetailScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  const [detail, setDetail] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      if (!id) return
      setLoading(true)
      fetchBookingDetail(id)
        .then((data) => { setDetail(data); setError(null) })
        .catch((e) => setError(e instanceof Error ? e.message : '載入失敗'))
        .finally(() => setLoading(false))
    }, [id])
  )

  const now = new Date()

  if (loading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <ActivityIndicator size="large" color="#1F2723" />
      </YStack>
    )
  }

  if (error || !detail) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background" gap={16}>
        <Text fontSize={15} color="#808868">{error ?? '找不到預約'}</Text>
        <Pressable onPress={() => router.back()}>
          <Text fontSize={14} fontWeight="600" color="#1F2723">返回</Text>
        </Pressable>
      </YStack>
    )
  }

  const startsAt = new Date(detail.starts_at)
  const createdAt = new Date(detail.created_at)
  const domainLabel = detail.service_domain === 'nails' ? '美甲' : '美睫'

  // Timing calculations
  const msUntilStart = startsAt.getTime() - now.getTime()
  const minUntilStart = msUntilStart / 60_000
  const msSinceCreation = now.getTime() - createdAt.getTime()
  const minSinceCreation = msSinceCreation / 60_000

  const isUpcoming = detail.status === 'confirmed' && msUntilStart > 0
  const isDayOf = isUpcoming && minUntilStart <= 24 * 60
  const showPhone = isDayOf && minUntilStart <= 10
  const showLateButton = isDayOf && minUntilStart <= 10 && !detail.customer_late_notified_at
  const showNoShowButton = detail.status === 'confirmed' && msUntilStart < 0 &&
    Math.abs(minUntilStart) >= detail.no_show_window_minutes
  const isInGrace = minSinceCreation <= 10
  const isTerminal = ['cancelled_grace', 'cancelled_customer', 'cancelled_pro',
    'no_show_customer', 'no_show_pro', 'rescheduled', 'expired'].includes(detail.status)

  function handleCancel() {
    let flagWarning = ''
    if (isInGrace) {
      flagWarning = '10分鐘內免責取消，不會影響你的紀錄。'
    } else if (minUntilStart > 120) {
      flagWarning = '取消後將記錄一次輕微違規。'
    } else if (minUntilStart > 30) {
      flagWarning = '距離預約不到2小時，取消後將記錄一次輕微違規。'
    } else {
      flagWarning = '距離預約不到30分鐘，取消將記錄一次嚴重違規。'
    }
    Alert.alert('確定取消預約？', flagWarning, [
      { text: '先不要', style: 'cancel' },
      { text: '確定取消', style: 'destructive', onPress: () => {
        // TODO: call cancel API when backend is ready
        Alert.alert('已取消', '預約已取消')
        router.back()
      }},
    ])
  }

  function handleLateNotify() {
    // TODO: call late-notify API when backend is ready
    Alert.alert('已通知', '已通知設計師你會晚到')
  }

  function handleNoShow() {
    Alert.alert('確認設計師未到場？', '我們會記錄此事件並通知設計師。', [
      { text: '先不要', style: 'cancel' },
      { text: '確認', style: 'destructive', onPress: () => {
        // TODO: call no-show API when backend is ready
        Alert.alert('已回報', '已記錄設計師未到場')
        router.back()
      }},
    ])
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Header */}
      <XStack
        paddingTop={insets.top}
        height={insets.top + 48}
        alignItems="center"
        paddingHorizontal={12}
      >
        <Pressable
          onPress={() => router.back()}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          accessibilityRole="button"
          accessibilityLabel="返回"
        >
          <FA6ProIcon name="chevron-left" size={20} color="#1F2723" />
        </Pressable>
        <View flex={1} alignItems="center">
          <Text fontSize={16} fontWeight="600" color="#1F2723">預約詳情</Text>
        </View>
        <View width={44} />
      </XStack>

      <ScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
      >
        {/* Booking info card */}
        <YStack backgroundColor="#F0EDE5" borderRadius={8} padding={20} gap={16} marginTop={16}>
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize={20} fontWeight="700" lineHeight={28} color="#1F2723">
              {detail.pro_display_name}
            </Text>
            <StatusBadge status={detail.status} />
          </XStack>

          <YStack gap={8}>
            <XStack gap={8} alignItems="center">
              <FA6ProIcon name="scissors" size={14} color="#808868" />
              <Text fontSize={15} lineHeight={22} color="#808868">
                {domainLabel} — {detail.service_label}
              </Text>
            </XStack>

            <XStack gap={8} alignItems="center">
              <FA6ProIcon name="calendar" size={14} color="#808868" />
              <Text fontSize={15} lineHeight={22} color="#808868">
                {formatBookingDate(detail.starts_at)} {formatSlotTime(detail.starts_at)}
              </Text>
            </XStack>

            <XStack gap={8} alignItems="center">
              <FA6ProIcon name="location-dot" size={14} color="#808868" />
              <Text fontSize={15} lineHeight={22} color="#808868">
                {detail.studio_address}
              </Text>
            </XStack>

            <XStack gap={8} alignItems="center">
              <FA6ProIcon name="dollar-sign" size={14} color="#808868" />
              <Text fontSize={15} lineHeight={22} color="#808868">
                NT${detail.price_min}–{detail.price_max}
              </Text>
            </XStack>

            {showPhone && detail.pro_phone && (
              <XStack gap={8} alignItems="center">
                <FA6ProIcon name="phone" size={14} color="#2E7D52" />
                <Text fontSize={15} fontWeight="600" color="#2E7D52">
                  {detail.pro_phone}
                </Text>
              </XStack>
            )}
          </YStack>
        </YStack>

        {/* Action buttons */}
        {isUpcoming && !isTerminal && (
          <YStack gap={12} marginTop={24}>
            {/* Cancel */}
            <Pressable
              onPress={handleCancel}
              accessibilityRole="button"
              accessibilityLabel={isInGrace ? '免責取消' : '取消預約'}
              style={({ pressed }) => ({
                borderRadius: 9999,
                height: 48,
                backgroundColor: '#1F2723',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Text fontSize={16} fontWeight="600" color="#FBFBF8">
                {isInGrace ? '免責取消' : '取消預約'}
              </Text>
            </Pressable>

            {/* Late notify */}
            {showLateButton && (
              <Pressable
                onPress={handleLateNotify}
                accessibilityRole="button"
                accessibilityLabel="我會晚到"
                style={({ pressed }) => ({
                  borderRadius: 9999,
                  height: 48,
                  borderWidth: 1,
                  borderColor: '#1F2723',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text fontSize={16} fontWeight="600" color="#1F2723">我會晚到</Text>
              </Pressable>
            )}

            {/* Reschedule (disabled — future scope) */}
            <Pressable
              disabled
              style={{
                borderRadius: 9999,
                height: 48,
                borderWidth: 1,
                borderColor: '#EAEAE4',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.4,
              }}
            >
              <Text fontSize={16} fontWeight="600" color="#808868">改期（即將推出）</Text>
            </Pressable>
          </YStack>
        )}

        {/* No-show button */}
        {showNoShowButton && (
          <YStack marginTop={24}>
            <Pressable
              onPress={handleNoShow}
              accessibilityRole="button"
              accessibilityLabel="設計師未到場"
              style={({ pressed }) => ({
                borderRadius: 9999,
                height: 48,
                backgroundColor: '#C62828',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Text fontSize={16} fontWeight="600" color="#FBFBF8">設計師未到場</Text>
            </Pressable>
          </YStack>
        )}

        {/* Completed — rating (disabled — future scope) */}
        {detail.status === 'completed' && (
          <YStack marginTop={24}>
            <Pressable
              disabled
              style={{
                borderRadius: 9999,
                height: 48,
                borderWidth: 1,
                borderColor: '#EAEAE4',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.4,
              }}
            >
              <Text fontSize={16} fontWeight="600" color="#808868">評分（即將推出）</Text>
            </Pressable>
          </YStack>
        )}

        {/* Payment note */}
        {isUpcoming && (
          <Text fontSize={13} color="#808868" textAlign="center" marginTop={24}>
            實際費用將於服務結束後由設計師確認
          </Text>
        )}
      </ScrollView>
    </YStack>
  )
}
