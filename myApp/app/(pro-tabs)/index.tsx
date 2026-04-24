// app/(pro-tabs)/index.tsx
import { useCallback, useState } from 'react'
import { ScrollView, RefreshControl, ActivityIndicator, View } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'

import { BookingCardPro } from '@/components/pro/BookingCardPro'
import { fetchProBookings } from '@/lib/pro-bookings-api'
import { splitProBookings, getProDisplayStatus } from '@/lib/pro-helpers'
import type { ProBookingListItem } from '@/types/pro'

const WEEKDAYS_ZH = ['日', '一', '二', '三', '四', '五', '六']

function formatTodayHeader(): string {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const weekday = WEEKDAYS_ZH[now.getDay()]
  return `${month}/${day} 週${weekday}`
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <YStack
      flex={1}
      backgroundColor="#F5F5F0"
      borderRadius={12}
      paddingVertical={14}
      paddingHorizontal={12}
      alignItems="center"
      gap={4}
    >
      <Text fontSize={24} fontWeight="700" color="#141413" lineHeight={32}>
        {value}
      </Text>
      <Text fontSize={12} color="#858279" lineHeight={16}>
        {label}
      </Text>
    </YStack>
  )
}

export default function ProHomeScreen() {
  const insets = useSafeAreaInsets()
  const [bookings, setBookings] = useState<ProBookingListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const data = await fetchProBookings()
    setBookings(data)
    setLoading(false)
    setRefreshing(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      load()
    }, [load])
  )

  if (loading && !refreshing) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="#FBFBF8">
        <ActivityIndicator size="large" color="#141413" />
      </YStack>
    )
  }

  const { today } = splitProBookings(bookings)

  const completed = today.filter(b => {
    const s = getProDisplayStatus(b.status, b.starts_at, b.ends_at)
    return s === 'completed' || s === 'no_show'
  }).length
  const remaining = today.length - completed

  const nextBooking = today.find(b => {
    const s = getProDisplayStatus(b.status, b.starts_at, b.ends_at)
    return s === 'awaiting' || s === 'in_progress'
  }) ?? null

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FBFBF8' }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#141413" />
      }
    >
      {/* Header */}
      <YStack paddingTop={insets.top + 20} paddingHorizontal={20} paddingBottom={20}>
        <Text fontSize={22} fontWeight="700" color="#141413" lineHeight={30}>
          總覽
        </Text>
        <Text fontSize={13} color="#858279" marginTop={2}>
          {formatTodayHeader()}
        </Text>
      </YStack>

      {/* Today stats */}
      <XStack paddingHorizontal={16} gap={10} marginBottom={28}>
        <StatCard label="今日預約" value={today.length} />
        <StatCard label="已完成" value={completed} />
        <StatCard label="剩餘" value={remaining} />
      </XStack>

      {/* Next client */}
      <YStack paddingHorizontal={20} marginBottom={16}>
        <Text fontSize={13} fontWeight="600" color="#858279" lineHeight={18} marginBottom={10}>
          下一位客戶
        </Text>
        <View style={{ backgroundColor: '#F5F5F0', borderRadius: 12, overflow: 'hidden' }}>
          {nextBooking ? (
            <BookingCardPro booking={nextBooking} onActionComplete={load} />
          ) : (
            <YStack paddingVertical={24} alignItems="center">
              <Text fontSize={14} color="#858279">今日沒有待服務的預約</Text>
            </YStack>
          )}
        </View>
      </YStack>
    </ScrollView>
  )
}
