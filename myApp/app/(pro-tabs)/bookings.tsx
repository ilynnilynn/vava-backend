// app/(pro-tabs)/bookings.tsx
import { useCallback, useState } from 'react'
import { FlatList, Pressable, RefreshControl, ActivityIndicator, View } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'

import { BookingCardPro } from '@/components/pro/BookingCardPro'
import { fetchProBookings } from '@/lib/pro-bookings-api'
import { splitProBookings } from '@/lib/pro-helpers'
import type { ProBookingListItem } from '@/types/pro'

type Tab = 'upcoming' | 'history'

export default function ProBookingsScreen() {
  const insets = useSafeAreaInsets()
  const [bookings, setBookings] = useState<ProBookingListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('upcoming')

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

  const { upcoming, past } = splitProBookings(bookings)
  const data = activeTab === 'upcoming' ? upcoming : past

  return (
    <YStack flex={1} backgroundColor="#FBFBF8">
      {/* Header */}
      <YStack paddingTop={insets.top + 21} paddingHorizontal={16} paddingBottom={20}>
        <Text fontSize={22} fontWeight="700" lineHeight={30} color="#141413">
          預約管理
        </Text>
      </YStack>

      {/* Tab bar */}
      <XStack
        marginHorizontal={16}
        marginBottom={12}
        borderBottomWidth={1}
        borderBottomColor="#EAEAE4"
      >
        <TabPill label="即將到來" active={activeTab === 'upcoming'} onPress={() => setActiveTab('upcoming')} />
        <TabPill label="歷史紀錄" active={activeTab === 'history'} onPress={() => setActiveTab('history')} />
      </XStack>

      {/* List */}
      {data.length === 0 ? (
        <YStack flex={1} justifyContent="center" alignItems="center" paddingHorizontal={24}>
          <Text fontSize={14} color="#858279">
            {activeTab === 'upcoming' ? '目前沒有即將到來的預約' : '還沒有歷史紀錄'}
          </Text>
        </YStack>
      ) : (
        <FlatList
          data={data}
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

function TabPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 2,
        borderBottomColor: active ? '#F9583B' : 'transparent',
        opacity: !active && pressed ? 0.5 : 1,
      })}
    >
      <Text fontSize={16} fontWeight={active ? '700' : '500'} color={active ? '#141413' : '#858279'}>
        {label}
      </Text>
    </Pressable>
  )
}
