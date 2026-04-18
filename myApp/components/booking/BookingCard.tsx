import { Pressable } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useRouter } from 'expo-router'

import { StatusBadge } from './StatusBadge'
import { formatBookingDate, formatSlotTime } from '@/lib/booking-helpers'
import type { BookingListItem } from '@/types/booking-list'

type Props = {
  booking: BookingListItem
}

export function BookingCard({ booking }: Props) {
  const router = useRouter()

  const domainLabel = booking.service_domain === 'nails' ? '美甲' : '美睫'
  const dateLabel = formatBookingDate(booking.starts_at)
  const timeLabel = formatSlotTime(booking.starts_at)

  return (
    <Pressable onPress={() => router.push(`/booking/${booking.id}`)}>
      <YStack
        backgroundColor="#F0EDE5"
        borderRadius={12}
        padding={16}
        gap={8}
      >
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={16} fontWeight="700" color="#1F2723">
            {booking.pro_display_name}
          </Text>
          <StatusBadge status={booking.status} />
        </XStack>
        <Text fontSize={14} color="#808868">
          {domainLabel}
        </Text>
        <Text fontSize={14} color="#808868">
          {dateLabel} {timeLabel}
        </Text>
      </YStack>
    </Pressable>
  )
}
