import { useState, useEffect } from 'react'
import { Pressable, ActivityIndicator, Alert } from 'react-native'
import { YStack, XStack, Text, ScrollView, View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBadge } from './StatusBadge'
import { AppIcon } from '@/components/AppIcon'
import { fetchBookingDetail } from '@/lib/bookings-api'
import { formatBookingDate, formatSlotTime } from '@/lib/booking-helpers'
import type { BookingDetail } from '@/types/booking-list'
import { HeartButton } from '@/components/HeartButton'
import { fetchLikedPros, likePro, unlikePro, isProLiked } from '@/lib/liked-pros-api'
import type { LikedPro } from '@/types/liked-pros'

type Props = {
  bookingId: string
  onClose: () => void
}

export function BookingDetailSheet({ bookingId, onClose }: Props) {
  const insets = useSafeAreaInsets()

  const [detail, setDetail] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [likedPros, setLikedPros] = useState<LikedPro[]>([])

  useEffect(() => {
    setLoading(true)
    fetchBookingDetail(bookingId)
      .then((data) => { setDetail(data); setError(null) })
      .catch((e) => setError(e instanceof Error ? e.message : '載入失敗'))
      .finally(() => setLoading(false))
  }, [bookingId])

  useEffect(() => {
    fetchLikedPros().then(setLikedPros).catch(() => {})
  }, [])

  async function handleHeartToggle() {
    if (!detail) return
    // NOTE: BookingDetail has no pro_id field yet (schema gap). Use pro_display_name as a
    // stable mock key until the backend exposes pro_id.
    const proId = `display:${detail.pro_display_name}`
    const wasLiked = isProLiked(proId, likedPros)
    if (wasLiked) {
      setLikedPros((prev) => prev.filter((p) => p.pro_id !== proId))
      await unlikePro(proId).catch(() => {
        setLikedPros((prev) => [...prev, { pro_id: proId, pro_display_name: detail.pro_display_name, service_domain: detail.service_domain, profile_photo_url: null }])
      })
    } else {
      setLikedPros((prev) => [...prev, { pro_id: proId, pro_display_name: detail.pro_display_name, service_domain: detail.service_domain, profile_photo_url: null }])
      await likePro(proId).catch(() => {
        setLikedPros((prev) => prev.filter((p) => p.pro_id !== proId))
      })
    }
  }

  const now = new Date()

  if (loading && !detail) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <ActivityIndicator size="large" color="#1F2723" />
      </YStack>
    )
  }

  if (error || !detail) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background" gap={16}>
        <Text fontSize={15} color="#626765">{error ?? '找不到預約'}</Text>
        <Pressable onPress={onClose}>
          <Text fontSize={14} fontWeight="600" color="#1F2723">關閉</Text>
        </Pressable>
      </YStack>
    )
  }

  const startsAt = new Date(detail.starts_at)
  const createdAt = new Date(detail.created_at)
  const domainLabel = detail.service_domain === 'nails' ? '美甲' : '美睫'

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
        Alert.alert('已取消', '預約已取消')
        onClose()
      }},
    ])
  }

  function handleLateNotify() {
    Alert.alert('已通知', '已通知設計師你會晚到')
  }

  function handleNoShow() {
    Alert.alert('確認設計師未到場？', '我們會記錄此事件並通知設計師。', [
      { text: '先不要', style: 'cancel' },
      { text: '確認', style: 'destructive', onPress: () => {
        Alert.alert('已回報', '已記錄設計師未到場')
        onClose()
      }},
    ])
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Handle bar + close */}
      <YStack alignItems="center" paddingTop={8} paddingBottom={4}>
        <View width={36} height={4} borderRadius={2} backgroundColor="#E8E9E9" />
      </YStack>
      <XStack height={48} alignItems="center" paddingHorizontal={12}>
        <View flex={1} />
        <Text fontSize={16} fontWeight="600" color="#1F2723">預約詳情</Text>
        <View flex={1} alignItems="flex-end">
          <Pressable
            onPress={onClose}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            accessibilityLabel="關閉"
          >
            <AppIcon name="close" size={20} color="#1F2723" />
          </Pressable>
        </View>
      </XStack>

      <ScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
      >
        {/* Booking info card */}
        <YStack backgroundColor="#F0EDE5" borderRadius={8} padding={20} gap={16} marginTop={8}>
          <XStack justifyContent="space-between" alignItems="center">
            <XStack alignItems="center" gap={4} flex={1}>
              <Text fontSize={20} fontWeight="700" lineHeight={28} color="#1F2723">
                {detail.pro_display_name}
              </Text>
              <HeartButton
                isLiked={isProLiked(`display:${detail.pro_display_name}`, likedPros)}
                onToggle={handleHeartToggle}
                size={20}
              />
            </XStack>
            <StatusBadge status={detail.status} />
          </XStack>

          <YStack gap={8}>
            <XStack gap={8} alignItems="center">
              <AppIcon name="serviceGeneric" size={14} color="#626765" weight="solid" />
              <Text fontSize={15} lineHeight={22} color="#626765">
                {domainLabel} — {detail.service_label}
              </Text>
            </XStack>

            <XStack gap={8} alignItems="center">
              <AppIcon name="calendar" size={14} color="#626765" />
              <Text fontSize={15} lineHeight={22} color="#626765">
                {formatBookingDate(detail.starts_at)} {formatSlotTime(detail.starts_at)}
              </Text>
            </XStack>

            <XStack gap={8} alignItems="center">
              <AppIcon name="location" size={14} color="#626765" />
              <Text fontSize={15} lineHeight={22} color="#626765">
                {detail.studio_address}
              </Text>
            </XStack>

            <XStack gap={8} alignItems="center">
              <AppIcon name="dollarSign" size={14} color="#626765" />
              <Text fontSize={15} lineHeight={22} color="#626765">
                NT${detail.price_min}–{detail.price_max}
              </Text>
            </XStack>

            {showPhone && detail.pro_phone && (
              <XStack gap={8} alignItems="center">
                <AppIcon name="phone" size={14} color="#626765" />
                <Text fontSize={15} fontWeight="600" color="#626765">
                  {detail.pro_phone}
                </Text>
              </XStack>
            )}
          </YStack>
        </YStack>

        {/* Action buttons */}
        {isUpcoming && !isTerminal && (
          <YStack gap={12} marginTop={24}>
            <Pressable
              onPress={handleCancel}
              style={{
                borderRadius: 9999,
                height: 48,
                borderWidth: 1,
                borderColor: '#CC3352',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text fontSize={16} fontWeight="600" color="#CC3352">
                {isInGrace ? '免責取消' : '取消預約'}
              </Text>
            </Pressable>

            {showLateButton && (
              <Pressable
                onPress={handleLateNotify}
                style={{
                  borderRadius: 9999,
                  height: 48,
                  borderWidth: 1,
                  borderColor: '#1F2723',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text fontSize={16} fontWeight="600" color="#1F2723">我會晚到</Text>
              </Pressable>
            )}

            <Pressable
              disabled
              style={{
                borderRadius: 9999,
                height: 48,
                borderWidth: 1,
                borderColor: '#E8E9E9',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.4,
              }}
            >
              <Text fontSize={16} fontWeight="600" color="#626765">改期（即將推出）</Text>
            </Pressable>
          </YStack>
        )}

        {showNoShowButton && (
          <YStack marginTop={24}>
            <Pressable
              onPress={handleNoShow}
              style={{
                borderRadius: 9999,
                height: 48,
                backgroundColor: '#C62828',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text fontSize={16} fontWeight="600" color="#FBFBF8">設計師未到場</Text>
            </Pressable>
          </YStack>
        )}

        {detail.status === 'completed' && (
          <YStack marginTop={24}>
            <Pressable
              disabled
              style={{
                borderRadius: 9999,
                height: 48,
                borderWidth: 1,
                borderColor: '#E8E9E9',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.4,
              }}
            >
              <Text fontSize={16} fontWeight="600" color="#626765">評分（即將推出）</Text>
            </Pressable>
          </YStack>
        )}

        {isUpcoming && (
          <Text fontSize={13} color="#626765" textAlign="center" marginTop={24}>
            實際費用將於服務結束後由設計師確認
          </Text>
        )}
      </ScrollView>
    </YStack>
  )
}
