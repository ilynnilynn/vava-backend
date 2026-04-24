// app/(pro-tabs)/index.tsx
import { useCallback, useState } from 'react'
import { FlatList, RefreshControl, ActivityIndicator, View } from 'react-native'
import { YStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { FA6ProIcon } from '@/components/FA6ProIcon'

import { BookingCardPro } from '@/components/pro/BookingCardPro'
import { fetchProBookings } from '@/lib/pro-bookings-api'
import { splitProBookings } from '@/lib/pro-helpers'
import type { ProBookingListItem } from '@/types/pro'

const WEEKDAYS_ZH = ['日', '一', '二', '三', '四', '五', '六']

function formatTodayHeader(): string {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const weekday = WEEKDAYS_ZH[now.getDay()]
  return `${month}/${day} 週${weekday}`
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

  const { today } = splitProBookings(bookings)

  if (loading && !refreshing) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="#FBFBF8">
        <ActivityIndicator size="large" color="#141413" />
      </YStack>
    )
  }

  return (
    <YStack flex={1} backgroundColor="#FBFBF8">
      {/* Header */}
      <YStack
        paddingTop={insets.top + 20}
        paddingHorizontal={20}
        paddingBottom={16}
      >
        <Text fontSize={22} fontWeight="700" color="#141413" lineHeight={30}>
          今日預約
        </Text>
        <Text fontSize={13} color="#858279" marginTop={2}>
          {formatTodayHeader()}
        </Text>
      </YStack>

      {today.length === 0 ? (
        <YStack flex={1} justifyContent="center" alignItems="center" gap={12} paddingHorizontal={24}>
          <FA6ProIcon name="calendar-xmark" size={40} color="#e0e0d8" />
          <Text fontSize={15} color="#858279">今天沒有預約</Text>
        </YStack>
      ) : (
        <FlatList
          data={today}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 100,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#141413" />
          }
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: '#e8e6dc', marginHorizontal: 16 }} />
          )}
          renderItem={({ item }) => (
            <BookingCardPro booking={item} onActionComplete={load} />
          )}
        />
      )}
    </YStack>
  )
}
