import { useState } from 'react'
import { Pressable, Alert } from 'react-native'
import { YStack, XStack, Text, ScrollView, View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useBookingRequest } from '@/lib/booking-context'
import { FA6ProIcon } from '@/components/FA6ProIcon'
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

  // ── Build display strings ──
  const categoryLabel = state.category === 'nails' ? '美甲' : state.category === 'lashes' ? '美睫' : '彩妝'
  const proTitle = state.category === 'nails' ? '美甲師' : state.category === 'lashes' ? '美睫師' : '美妝師'
  const dateLabel = params.startsAt ? formatBookingDate(params.startsAt) : ''
  const timeLabel = params.startsAt ? formatSlotTime(params.startsAt) : ''
  const priceMin = params.priceMin ? Number(params.priceMin) : 0

  // Multi-line service display
  // Line 1: scope + style + primary category (space-separated)
  // Remaining lines: 其他服務：XXX
  const serviceLines: string[] = []
  // Exclude '保養' from categoryIds if treatmentTier handles it
  const displayCategoryIds = (state.services?.categoryIds ?? []).filter(
    id => !(state.services?.treatmentTier && id === '保養')
  )

  const mainParts: string[] = []
  if (state.services?.nailScope) mainParts.push(state.services.nailScope.replace('+', '＋'))
  if (state.services?.styleId) mainParts.push(state.services.styleId)
  if (displayCategoryIds.length) mainParts.push(displayCategoryIds[0])
  if (state.services?.lashDensity) mainParts.push(state.services.lashDensity)
  if (mainParts.length) serviceLines.push(mainParts.join(' '))
  else serviceLines.push(categoryLabel)

  // Extra category IDs beyond the first
  if (displayCategoryIds.length > 1) {
    displayCategoryIds.slice(1).forEach(id => serviceLines.push(id))
  }
  if (state.services?.treatmentTier) {
    const scope = state.services.nailScope?.replace('+', '＋') ?? ''
    serviceLines.push([scope, state.services.treatmentTier, '保養'].filter(Boolean).join(' '))
  }
  if (state.services?.fiberTagId) serviceLines.push(state.services.fiberTagId)
  if (state.services?.fillInDays != null) serviceLines.push(`補色 ${state.services.fillInDays} 天`)
  if (state.addons?.length) state.addons.forEach(a => serviceLines.push(a))

  // Notes: preferences + customer note
  const noteParts: string[] = []
  if (state.preferences?.length) noteParts.push(...state.preferences)
  if (state.customerNote) noteParts.push(state.customerNote)
  const noteLabel = noteParts.join('　')

  async function handleConfirm() {
    setSubmitting(true)
    try {
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
            accessibilityRole="button"
            accessibilityLabel="返回"
          >
            <FA6ProIcon name="chevron-left" size={20} color="#1F2723" />
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
        <YStack backgroundColor="#F0EDE5" borderRadius={8} padding={20} gap={16}>
          {/* Pro name */}
          <Text fontSize={20} fontWeight="700" lineHeight={28} color="#1F2723">
            {params.proName}
          </Text>

          {/* Service summary */}
          <ServiceRows lines={serviceLines} />

          {/* Notes & preferences */}
          {noteLabel ? <InfoRow icon="pen" label="備註" value={noteLabel} /> : null}

          {/* Reference photo indicator */}
          {state.refPhotoUrl ? <InfoRow icon="image" label="參考圖片" value="已上傳 1 張" /> : null}

          {/* Date & time */}
          <InfoRow icon="calendar" label="日期" value={dateLabel} />
          <InfoRow icon="clock" label="時間" value={timeLabel} />

          {/* Price */}
          <InfoRow icon="tag" label="估價" value={`NT$${priceMin} 起`} />

          {/* Address */}
          <InfoRow
            icon="location-dot"
            label="地址"
            value={params.studioAddress || '確認後由設計師提供'}
          />
        </YStack>

        {/* Payment note */}
        <Text fontSize={13} color="#626765" paddingTop={16} lineHeight={20} textAlign="center">
          實際費用將於服務現場由{proTitle}確認
        </Text>
      </ScrollView>

      {/* Grace cancellation banner */}
      <YStack paddingHorizontal={16} paddingTop={12}>
        <XStack
          backgroundColor="#EDF2EC"
          borderRadius={10}
          paddingHorizontal={14}
          paddingVertical={10}
          alignItems="center"
          justifyContent="center"
          gap={10}
        >
          <FA6ProIcon name="shield-halved" size={15} color="#626765" />
          <YStack gap={1} alignItems="center">
            <Text fontSize={13} fontWeight="600" lineHeight={18} color="#4d4c48" textAlign="center">
              確認後10分鐘內可免責取消
            </Text>
            <Text fontSize={12} lineHeight={16} color="#626765" textAlign="center">
              安心預約，隨時保有彈性
            </Text>
          </YStack>
        </XStack>
      </YStack>

      {/* Bottom CTA */}
      <YStack
        paddingHorizontal={16}
        paddingTop={10}
        paddingBottom={insets.bottom + 12}
        backgroundColor="#FBFBF8"
      >
        <Pressable
          onPress={handleConfirm}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel="確認預約"
          style={({ pressed }) => ({
            borderRadius: 9999,
            height: 48,
            backgroundColor: '#1F2723',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: submitting ? 0.4 : pressed ? 0.75 : 1,
          })}
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

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <XStack justifyContent="space-between" alignItems="flex-start" gap={12}>
      <XStack alignItems="center" gap={8} style={{ minWidth: 80 }}>
        <FA6ProIcon name={icon} size={13} color="#626765" />
        <Text fontSize={14} lineHeight={20} color="#626765">{label}</Text>
      </XStack>
      <Text fontSize={15} lineHeight={22} fontWeight="600" color="#1F2723" flex={1} textAlign="right">
        {value}
      </Text>
    </XStack>
  )
}

function ServiceRows({ lines }: { lines: string[] }) {
  return (
    <XStack justifyContent="space-between" alignItems="flex-start" gap={12}>
      <XStack alignItems="center" gap={8} style={{ minWidth: 80 }}>
        <FA6ProIcon name="flower" size={13} color="#626765" />
        <Text fontSize={14} lineHeight={20} color="#626765">服務</Text>
      </XStack>
      <YStack flex={1} alignItems="flex-end" gap={2}>
        {lines.map((line, i) => (
          <Text key={i} fontSize={15} lineHeight={22} fontWeight="600" color="#1F2723" textAlign="right">
            {line}
          </Text>
        ))}
      </YStack>
    </XStack>
  )
}
