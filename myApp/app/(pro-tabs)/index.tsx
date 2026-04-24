// app/(pro-tabs)/index.tsx
import { useCallback, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, ActivityIndicator, View } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'

import { fetchProBookings } from '@/lib/pro-bookings-api'
import { fetchSlots } from '@/lib/slots-api'
import { splitProBookings } from '@/lib/pro-helpers'
import type { ProBookingListItem, SlotItem, SlotState } from '@/types/pro'

// ── Types ─────────────────────────────────────────────────────
type NudgeState = 'none_open' | 'open_no_bookings' | 'open_with_bookings'

// ── Helpers ───────────────────────────────────────────────────
const WEEKDAYS_ZH = ['日', '一', '二', '三', '四', '五', '六']

function formatTodayHeader(): string {
  const now = new Date()
  return `${now.getMonth() + 1}/${now.getDate()} 週${WEEKDAYS_ZH[now.getDay()]}`
}

function isToday(isoString: string, now = new Date()): boolean {
  return isoString.slice(0, 10) === now.toISOString().slice(0, 10)
}

function isThisWeek(isoString: string, now = new Date()): boolean {
  const date = new Date(isoString)
  const startOfWeek = new Date(now)
  startOfWeek.setHours(0, 0, 0, 0)
  startOfWeek.setDate(now.getDate() - now.getDay())
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 7)
  return date >= startOfWeek && date < endOfWeek
}

function getNudgeState(openCount: number, bookedCount: number): NudgeState {
  if (openCount === 0) return 'none_open'
  if (bookedCount === 0) return 'open_no_bookings'
  return 'open_with_bookings'
}

// ── NudgeBanner ───────────────────────────────────────────────
function NudgeBanner({ nudgeState, openCount, bookedCount, onPress }: {
  nudgeState: NudgeState
  openCount: number
  bookedCount: number
  onPress: () => void
}) {
  const isWarn = nudgeState === 'none_open'
  const bg = isWarn ? '#fef3cd' : '#f0fdf4'
  const dotColor = isWarn ? '#c96442' : '#15803d'

  let content: React.ReactNode
  if (nudgeState === 'none_open') {
    content = (
      <Text fontSize={13} color="#141413" lineHeight={18} flex={1}>
        今日尚未開放時段。
        <Text fontWeight="600" color="#c96442">開放時段</Text>
        讓新客戶找到你 →
      </Text>
    )
  } else if (nudgeState === 'open_no_bookings') {
    content = (
      <Text fontSize={13} color="#141413" lineHeight={18} flex={1}>
        <Text fontWeight="600" color="#15803d">{openCount} 個時段</Text>
        已開放。等待新客戶預約中。
      </Text>
    )
  } else {
    content = (
      <Text fontSize={13} color="#141413" lineHeight={18} flex={1}>
        <Text fontWeight="600" color="#15803d">{bookedCount} 個預約</Text>
        已確認。還有 {openCount} 個空檔可接新客戶。
      </Text>
    )
  }

  return (
    <Pressable onPress={onPress} style={{ marginHorizontal: 16, marginBottom: 10 }}>
      <XStack backgroundColor={bg} borderRadius={10} padding={12} gap={8} alignItems="flex-start">
        <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: dotColor, marginTop: 3, flexShrink: 0 }} />
        {content}
      </XStack>
    </Pressable>
  )
}

// ── SlotDot ───────────────────────────────────────────────────
function SlotDot({ state }: { state: SlotState }) {
  const isBooked = state === 'booked'
  const isOpen = state === 'open'
  // 'available' and 'expired' both render as inactive; expired is slightly dimmer
  const isExpired = state === 'expired'

  return (
    <View style={{
      width: 10,
      height: 10,
      borderRadius: 2,
      backgroundColor: isBooked ? '#c96442' : isOpen ? '#141413' : isExpired ? '#D0CEC6' : '#E0E0D8',
      borderWidth: (!isBooked && !isOpen) ? 1 : 0,
      borderColor: '#c8c6be',
      opacity: isExpired ? 0.5 : 1,
    }} />
  )
}

// ── SlotCard ──────────────────────────────────────────────────
function SlotCard({ todaySlots, openCount, onPress }: {
  todaySlots: SlotItem[]
  openCount: number
  onPress: () => void
}) {
  const hasOpen = openCount > 0
  return (
    <Pressable onPress={onPress} style={{ marginHorizontal: 16, marginBottom: 12 }}>
      <YStack backgroundColor="#F5F5F0" borderRadius={12} padding={14}>
        <XStack justifyContent="space-between" alignItems="center" marginBottom={10}>
          <Text fontSize={13} fontWeight="600" color="#141413">
            {hasOpen ? `今日時段 · ${openCount} 個開放` : '今日時段'}
          </Text>
          <View style={{
            backgroundColor: hasOpen ? '#dcfce7' : '#F0EDE5',
            paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
          }}>
            <Text fontSize={11} fontWeight="600" color={hasOpen ? '#15803d' : '#858279'}>
              {hasOpen ? '接客中' : '未開放'}
            </Text>
          </View>
        </XStack>

        <XStack flexWrap="wrap" gap={4} marginBottom={8}>
          {todaySlots.map(s => <SlotDot key={s.starts_at} state={s.state} />)}
        </XStack>

        <XStack gap={12} marginBottom={10}>
          {([
            { color: '#c96442', border: false, label: '已預約' },
            { color: '#141413', border: false, label: '開放中' },
            { color: '#E0E0D8', border: true,  label: '可開放' },
          ] as const).map(({ color, border, label }) => (
            <XStack key={label} alignItems="center" gap={4}>
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color, borderWidth: border ? 1 : 0, borderColor: '#c8c6be' }} />
              <Text fontSize={11} color="#858279">{label}</Text>
            </XStack>
          ))}
        </XStack>

        <View style={{ borderTopWidth: 1, borderTopColor: '#e8e6dc', paddingTop: 10 }}>
          <Text fontSize={13} fontWeight="600" color="#141413" textAlign="center">
            {hasOpen ? '管理時段 →' : '前往開放時段 →'}
          </Text>
        </View>
      </YStack>
    </Pressable>
  )
}

// ── StatCard ──────────────────────────────────────────────────
function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <YStack flex={1} backgroundColor="#F5F5F0" borderRadius={10} paddingVertical={12} paddingHorizontal={8} alignItems="center" gap={4}>
      <Text fontSize={16} fontWeight="700" color="#141413" lineHeight={22}>{value}</Text>
      <Text fontSize={11} color="#858279" lineHeight={14} textAlign="center">{label}</Text>
    </YStack>
  )
}

// ── Screen ────────────────────────────────────────────────────
export default function ProHomeScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [bookings, setBookings] = useState<ProBookingListItem[]>([])
  const [slots, setSlots] = useState<SlotItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const [b, s] = await Promise.all([fetchProBookings(), fetchSlots()])
    setBookings(b)
    setSlots(s)
    setLoading(false)
    setRefreshing(false)
  }, [])

  useFocusEffect(useCallback(() => {
    setLoading(true)
    load()
  }, [load]))

  if (loading && !refreshing) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="#FBFBF8">
        <ActivityIndicator size="large" color="#141413" />
      </YStack>
    )
  }

  const { today: todayBookings, upcoming } = splitProBookings(bookings)
  const todaySlots = slots.filter(s => isToday(s.starts_at))
  const openSlots   = todaySlots.filter(s => s.state === 'open')
  const bookedSlots = todaySlots.filter(s => s.state === 'booked')
  const thisWeekCount = [...todayBookings, ...upcoming].filter(b => isThisWeek(b.starts_at)).length
  const nudgeState = getNudgeState(openSlots.length, bookedSlots.length)

  function goToSlots() { router.push('/(pro-tabs)/slots') }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FBFBF8' }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#141413" />
      }
    >
      <YStack paddingTop={insets.top + 20} paddingHorizontal={20} paddingBottom={16}>
        <Text fontSize={22} fontWeight="700" color="#141413" lineHeight={30}>總覽</Text>
        <Text fontSize={13} color="#858279" marginTop={2}>{formatTodayHeader()}</Text>
      </YStack>

      <NudgeBanner
        nudgeState={nudgeState}
        openCount={openSlots.length}
        bookedCount={bookedSlots.length}
        onPress={goToSlots}
      />

      <SlotCard
        todaySlots={todaySlots}
        openCount={openSlots.length}
        onPress={goToSlots}
      />

      <Text
        fontSize={11}
        fontWeight="600"
        color="#858279"
        paddingHorizontal={16}
        marginBottom={8}
        style={{ textTransform: 'uppercase', letterSpacing: 0.4 }}
      >
        本週表現
      </Text>
      <XStack paddingHorizontal={16} gap={10}>
        <StatCard label="搜尋曝光" value={24} />
        <StatCard label="客戶評分" value="4.9★" />
        <StatCard label="新預約" value={thisWeekCount} />
      </XStack>
    </ScrollView>
  )
}
