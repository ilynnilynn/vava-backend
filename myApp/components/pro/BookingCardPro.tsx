// components/pro/BookingCardPro.tsx
import { Alert, Pressable, StyleSheet, View, ActivityIndicator } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { FA6ProIcon } from '@/components/FA6ProIcon'
import { useState } from 'react'

import { getProDisplayStatus } from '@/lib/pro-helpers'
import { markBookingComplete, markBookingNoShow } from '@/lib/pro-bookings-api'
import type { ProBookingListItem, ProDisplayStatus } from '@/types/pro'

// ── Client avatar ─────────────────────────────────────────────

const AVATAR_PALETTE = [
  { bg: '#DFF5AD', fg: '#3d3d3a' },
  { bg: '#808868', fg: '#ffffff' },
  { bg: '#9472DE', fg: '#ffffff' },
  { bg: '#CDB5FF', fg: '#3d3d3a' },
  { bg: '#A4CFFB', fg: '#3d3d3a' },
  { bg: '#F063B4', fg: '#ffffff' },
  { bg: '#F78B92', fg: '#3d3d3a' },
  { bg: '#F1C9AC', fg: '#3d3d3a' },
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
  awaiting:    { label: '待到場', bg: '#e0f2fe', text: '#0369a1' },
  in_progress: { label: '進行中', bg: '#dcfce7', text: '#15803d' },
  completed:   { label: '已完成', bg: '#f0f0f0', text: '#888' },
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
        <ActivityIndicator size="small" color="#141413" />
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
        <Text fontSize={13} fontWeight="500" color="#b53333">客戶未到場</Text>
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
  const domainIcon = isNails ? 'hand-sparkles' : 'eye'

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
    <XStack paddingVertical={14} paddingHorizontal={20} gap={14} alignItems="flex-start">
      <ClientAvatar name={booking.client_display_name} />

      <YStack flex={1}>
        {/* Client name + badge */}
        <XStack justifyContent="space-between" alignItems="center" marginBottom={6}>
          <Text fontSize={16} fontWeight="700" color="#141413" flex={1} marginRight={8} numberOfLines={1}>
            {booking.client_display_name}
          </Text>
          <ProStatusBadge displayStatus={displayStatus} />
        </XStack>

        {/* Service + time */}
        <XStack gap={6} alignItems="center" marginBottom={2}>
          <FA6ProIcon name={domainIcon} size={12} color="#808868" />
          <Text fontSize={14} color="#808868">{booking.service_label}</Text>
        </XStack>
        <XStack gap={6} alignItems="center">
          <FA6ProIcon name="clock" size={12} color="#808868" />
          <Text fontSize={14} color="#808868">{startTime} — {endTime}</Text>
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
    width: 56,
    height: 56,
    borderRadius: 28,
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
    backgroundColor: '#141413',
  },
  actionBtnDanger: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f0d0d0',
  },
})
