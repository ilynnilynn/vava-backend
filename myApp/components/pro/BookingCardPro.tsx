// components/pro/BookingCardPro.tsx
import { Alert, Pressable, StyleSheet, View, ActivityIndicator } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { AppIcon } from '@/components/AppIcon'
import { useState } from 'react'

import { getProDisplayStatus } from '@/lib/pro-helpers'
import { markBookingComplete, markBookingNoShow } from '@/lib/pro-bookings-api'
import type { ProBookingListItem, ProDisplayStatus } from '@/types/pro'

// ── Client avatar ─────────────────────────────────────────────

const AVATAR_PALETTE = [
  { bg: '#C0E8BA', fg: '#353C38' },  // mint
  { bg: '#8FD3D1', fg: '#353C38' },  // teal
  { bg: '#8DC2E6', fg: '#353C38' },  // sky
  { bg: '#A8AFFF', fg: '#353C38' },  // periwinkle
  { bg: '#CDB5FF', fg: '#353C38' },  // lavender
  { bg: '#F98486', fg: '#353C38' },  // pink
  { bg: '#FD6B59', fg: '#353C38' },  // coral
  { bg: '#FFA46E', fg: '#353C38' },  // peach
  { bg: '#DFF5AD', fg: '#353C38' },  // lime
]

function getAvatarColor(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  }
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length]
}

function ClientAvatar({ name }: { name: string }) {
  const { bg, fg } = getAvatarColor(name)
  return (
    <View style={[styles.avatar, { backgroundColor: bg }]}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: fg, lineHeight: 24 }}>
        {name[0] ?? '?'}
      </Text>
    </View>
  )
}

// ── Status badge ─────────────────────────────────────────────

const BADGE_CONFIG: Record<ProDisplayStatus, { label: string; bg: string; text: string }> = {
  awaiting:    { label: '待到場', bg: 'rgba(168,175,255,0.2)', text: '#7D85E7' },
  in_progress: { label: '進行中', bg: '#dcfce7', text: '#15803d' },
  completed:   { label: '已完成', bg: '#f0f0f0', text: '#787D7B' },
  no_show:     { label: '未到場', bg: '#fee2e2', text: '#b91c1c' },
}

function ProStatusBadge({ displayStatus }: { displayStatus: ProDisplayStatus }) {
  const { label, bg, text } = BADGE_CONFIG[displayStatus]
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text fontSize={11} fontWeight="600" color={text}>{label}</Text>
    </View>
  )
}

// ── Action buttons ────────────────────────────────────────────

type ActionButtonsProps = {
  bookingId: string
  onActionComplete: () => void
}

function ActionButtons({ bookingId, onActionComplete }: ActionButtonsProps) {
  const [loading, setLoading] = useState(false)

  async function handleComplete() {
    Alert.alert('結束服務', '確定要結束本次服務嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '確定結束',
        onPress: async () => {
          setLoading(true)
          await markBookingComplete(bookingId)
          setLoading(false)
          onActionComplete()
        },
      },
    ])
  }

  async function handleNoShow() {
    Alert.alert('客戶未到場', '確定要標記為未到場嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '確定',
        style: 'destructive',
        onPress: async () => {
          setLoading(true)
          await markBookingNoShow(bookingId)
          setLoading(false)
          onActionComplete()
        },
      },
    ])
  }

  if (loading) {
    return (
      <View style={styles.actionsRow}>
        <ActivityIndicator size="small" color="#1F2723" />
      </View>
    )
  }

  return (
    <YStack gap={7} marginTop={8}>
      <Pressable
        onPress={handleComplete}
        accessibilityLabel="結束服務"
        style={({ pressed }) => [styles.actionBtn, styles.actionBtnPrimary, { opacity: pressed ? 0.8 : 1 }]}
      >
        <Text fontSize={13} fontWeight="600" color="#fff">✓ 結束服務</Text>
      </Pressable>
      <Pressable
        onPress={handleNoShow}
        accessibilityLabel="客戶未到場"
        style={({ pressed }) => [styles.actionBtn, styles.actionBtnDanger, { opacity: pressed ? 0.8 : 1 }]}
      >
        <Text fontSize={13} fontWeight="500" color="#CC3352">客戶未到場</Text>
      </Pressable>
    </YStack>
  )
}

// ── Main card ─────────────────────────────────────────────────

type Props = {
  booking: ProBookingListItem
  onActionComplete?: () => void
}

export function BookingCardPro({ booking, onActionComplete }: Props) {
  const displayStatus = getProDisplayStatus(
    booking.status,
    booking.starts_at,
    booking.ends_at
  )

  const isNails = booking.service_domain === 'nails'
  const domainIcon = isNails ? 'serviceNails' : 'serviceLashes' as const
  const domainLabel = isNails ? '美甲' : '美睫'

  const startTime = new Date(booking.starts_at).toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const endTime = new Date(booking.ends_at).toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  return (
    <XStack paddingVertical={14} paddingHorizontal={20} gap={14} alignItems="center">
      <ClientAvatar name={booking.client_display_name} />

      <YStack flex={1} gap={6}>
        {/* Client name + badge */}
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={16} fontWeight="500" color="#1F2723" flex={1} marginRight={8} numberOfLines={1}>
            {booking.client_display_name}
          </Text>
          <ProStatusBadge displayStatus={displayStatus} />
        </XStack>

        {/* Service + time */}
        <XStack gap={6} alignItems="center">
          <AppIcon name={domainIcon} size={12} color="#8F9391" />
          <Text fontSize={13} fontWeight="500" color="#8F9391">{domainLabel}</Text>
          <View style={{ width: 3, height: 3, borderRadius: 9999, backgroundColor: 'rgba(31,39,35,0.2)' }} />
          <Text fontSize={13} fontWeight="500" color="#8F9391">{startTime} — {endTime}</Text>
        </XStack>

        {/* Action buttons — only for in_progress */}
        {displayStatus === 'in_progress' && (
          <ActionButtons
            bookingId={booking.id}
            onActionComplete={onActionComplete ?? (() => {})}
          />
        )}
      </YStack>
    </XStack>
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
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  actionsRow: {
    marginTop: 8,
    alignItems: 'center',
  },
  actionBtn: {
    width: '100%',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnPrimary: {
    backgroundColor: '#1F2723',
  },
  actionBtnDanger: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f0d0d0',
  },
})
