import { Pressable, StyleSheet, View as RNView } from 'react-native'
import { YStack, XStack, Text, View } from 'tamagui'
import { AppIcon } from '@/components/AppIcon'

import { StatusBadge } from './StatusBadge'
import { formatBookingDate, formatSlotTime } from '@/lib/booking-helpers'
import type { BookingListItem } from '@/types/booking-list'

const AVATAR_PALETTE = [
  { bg: '#C0E8BA', fg: '#353C38' },
  { bg: '#8FD3D1', fg: '#353C38' },
  { bg: '#8DC2E6', fg: '#353C38' },
  { bg: '#A8AFFF', fg: '#353C38' },
  { bg: '#CDB5FF', fg: '#353C38' },
  { bg: '#F98486', fg: '#353C38' },
  { bg: '#FD6B59', fg: '#353C38' },
  { bg: '#FFA46E', fg: '#353C38' },
  { bg: '#DFF5AD', fg: '#353C38' },
]

function getAvatarColor(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  }
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length]
}

function ProAvatar({ name }: { name: string }) {
  const { bg, fg } = getAvatarColor(name)
  return (
    <RNView style={[styles.avatar, { backgroundColor: bg }]}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: fg, lineHeight: 24 }}>
        {name[0] ?? '?'}
      </Text>
    </RNView>
  )
}

type Props = {
  booking: BookingListItem
  onPress?: () => void
}

export function BookingCard({ booking, onPress }: Props) {
  const isNails = booking.service_domain === 'nails'
  const domainIcon = isNails ? 'serviceNails' : 'serviceLashes' as const
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
      <XStack paddingVertical={14} paddingHorizontal={20} gap={14} alignItems="center">
        <ProAvatar name={booking.pro_display_name} />

        <YStack flex={1} gap={6}>
          {/* Pro name + status badge */}
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize={16} fontWeight="500" color="#1F2723" flex={1} marginRight={8} numberOfLines={1}>
              {booking.pro_display_name}
            </Text>
            <StatusBadge status={booking.status} />
          </XStack>

          {/* Service + time */}
          <XStack gap={6} alignItems="center">
            <AppIcon name={domainIcon} size={12} color="#8F9391" />
            <Text fontSize={13} fontWeight="500" color="#8F9391">{domainLabel}</Text>
            <View width={3} height={3} borderRadius={9999} backgroundColor="rgba(31,39,35,0.2)" />
            <Text fontSize={13} fontWeight="500" color="#8F9391">{timeLabel}</Text>
          </XStack>
        </YStack>
      </XStack>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
})
