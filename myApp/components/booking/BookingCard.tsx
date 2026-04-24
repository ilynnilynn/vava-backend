import { Pressable } from 'react-native'
import { YStack, XStack, Text, View } from 'tamagui'
import { FA6ProIcon } from '@/components/FA6ProIcon'

import { StatusBadge } from './StatusBadge'
import { formatBookingDate, formatSlotTime } from '@/lib/booking-helpers'
import type { BookingListItem } from '@/types/booking-list'

type Props = {
  booking: BookingListItem
  onPress?: () => void
}

export function BookingCard({ booking, onPress }: Props) {
  const isNails = booking.service_domain === 'nails'
  const domainIcon = isNails ? 'hand-sparkles' : 'eye'
  const domainLabel = isNails ? '美甲' : '美睫'
  const dateLabel = formatBookingDate(booking.starts_at)
  const timeLabel = formatSlotTime(booking.starts_at)

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${booking.pro_display_name}，${domainLabel}，${dateLabel} ${timeLabel}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
    >
      <YStack
        paddingVertical={14}
        paddingHorizontal={12}
        gap={10}
      >
        {/* Pro name + status badge */}
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={16} fontWeight="700" color="#1F2723" flex={1} marginRight={8} numberOfLines={1}>
            {booking.pro_display_name}
          </Text>
          <StatusBadge status={booking.status} />
        </XStack>

        {/* Service type + date/time + chevron */}
        <XStack alignItems="center" justifyContent="space-between">
          <XStack gap={10} alignItems="center" flex={1}>
            <XStack gap={5} alignItems="center">
              <FA6ProIcon name={domainIcon} size={12} color="#808868" />
              <Text fontSize={14} fontWeight="500" color="#808868">{domainLabel}</Text>
            </XStack>
            <View width={3} height={3} borderRadius={9999} backgroundColor="rgba(31,39,35,0.2)" />
            <XStack gap={5} alignItems="center">
              <FA6ProIcon name="calendar" size={12} color="#808868" />
              <Text fontSize={14} fontWeight="500" color="#808868">{dateLabel}  {timeLabel}</Text>
            </XStack>
          </XStack>
          <FA6ProIcon name="chevron-right" size={11} color="rgba(31,39,35,0.25)" />
        </XStack>
      </YStack>
    </Pressable>
  )
}
