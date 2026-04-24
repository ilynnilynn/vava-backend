import { Pressable } from 'react-native'
import { YStack, Text, View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { FA6ProIcon } from '@/components/FA6ProIcon'

import { useBookingRequest } from '@/lib/booking-context'
import { formatBookingDate, formatSlotTime } from '@/lib/booking-helpers'

export default function SuccessScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { state, dispatch } = useBookingRequest()

  const params = useLocalSearchParams<{
    proName: string
    startsAt: string
    studioAddress: string
  }>()

  const categoryLabel = state.category === 'nails' ? '美甲' : state.category === 'lashes' ? '美睫' : '彩妝'
  const serviceLabel = state.services?.categoryIds?.length
    ? state.services.categoryIds.join('・')
    : ''
  const dateLabel = params.startsAt ? formatBookingDate(params.startsAt) : ''
  const timeLabel = params.startsAt ? formatSlotTime(params.startsAt) : ''

  function handleDismiss() {
    dispatch({ type: 'RESET' })
    router.dismissAll()
  }

  return (
    <YStack flex={1} backgroundColor="#FBFBF8" paddingTop={insets.top} paddingBottom={insets.bottom}>
      {/* Main content */}
      <YStack flex={1} justifyContent="center" alignItems="center" paddingHorizontal={24} gap={24}>
        {/* Checkmark */}
        <View
          width={80}
          height={80}
          borderRadius={40}
          backgroundColor="#E8F5E9"
          alignItems="center"
          justifyContent="center"
        >
          <FA6ProIcon name="circle-check" size={48} color="#2E7D52" />
        </View>

        {/* Title */}
        <Text fontSize={24} fontWeight="700" lineHeight={32} color="#1F2723">
          預約成功！
        </Text>

        {/* Booking card */}
        <YStack
          backgroundColor="#F0EDE5"
          borderRadius={8}
          padding={20}
          gap={12}
          width="100%"
        >
          <Text fontSize={18} fontWeight="700" lineHeight={26} color="#1F2723">
            {params.proName}
          </Text>

          <Text fontSize={14} lineHeight={20} color="#808868">
            {[categoryLabel, serviceLabel].filter(Boolean).join(' - ')}
          </Text>

          <Text fontSize={15} fontWeight="600" lineHeight={22} color="#1F2723">
            {dateLabel} {timeLabel}
          </Text>

          {params.studioAddress ? (
            <Text fontSize={14} color="#808868">
              {params.studioAddress}
            </Text>
          ) : null}
        </YStack>

        {/* Grace period note */}
        <Text fontSize={13} color="#808868" textAlign="center">
          10分鐘內可免責取消
        </Text>
      </YStack>

      {/* Bottom CTA */}
      <YStack paddingHorizontal={16} paddingBottom={12}>
        <Pressable
          onPress={handleDismiss}
          style={{
            borderRadius: 9999,
            height: 48,
            backgroundColor: '#1F2723',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text fontSize={16} fontWeight="600" color="#FBFBF8">回到首頁</Text>
        </Pressable>
      </YStack>
    </YStack>
  )
}
