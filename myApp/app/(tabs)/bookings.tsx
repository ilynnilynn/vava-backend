import { useState, useCallback } from 'react'
import { SectionList, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import { YStack, Text, View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { FontAwesome6 } from '@expo/vector-icons'

import { BookingCard } from '@/components/booking/BookingCard'
import { fetchBookings } from '@/lib/bookings-api'
import type { BookingListItem } from '@/types/booking-list'

type Section = {
  title: string
  data: BookingListItem[]
}

const UPCOMING_STATUSES = new Set(['confirmed', 'reschedule_pending'])

function splitBookings(bookings: BookingListItem[]): Section[] {
  const now = new Date().toISOString()
  const upcoming: BookingListItem[] = []
  const history: BookingListItem[] = []

  for (const b of bookings) {
    if (UPCOMING_STATUSES.has(b.status) && b.starts_at > now) {
      upcoming.push(b)
    } else {
      history.push(b)
    }
  }

  upcoming.sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  history.sort((a, b) => b.starts_at.localeCompare(a.starts_at))

  const sections: Section[] = []
  if (upcoming.length > 0) sections.push({ title: '即將到來', data: upcoming })
  if (history.length > 0) sections.push({ title: '歷史紀錄', data: history })
  return sections
}

export default function BookingsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const [bookings, setBookings] = useState<BookingListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchBookings()
      setBookings(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      load()
    }, [load])
  )

  function handleRefresh() {
    setRefreshing(true)
    load()
  }

  // Loading state
  if (loading && !refreshing) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <ActivityIndicator size="large" color="#1F2723" />
      </YStack>
    )
  }

  // Error state
  if (error) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background" gap={16} paddingHorizontal={24}>
        <Text fontSize={15} color="#808868" textAlign="center">{error}</Text>
        <Pressable
          onPress={() => { setLoading(true); load() }}
          style={{
            borderRadius: 9999,
            height: 40,
            paddingHorizontal: 20,
            backgroundColor: '#1F2723',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text fontSize={14} fontWeight="600" color="#FBFBF8">重試</Text>
        </Pressable>
      </YStack>
    )
  }

  // Empty state (zero bookings total)
  if (bookings.length === 0) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background" gap={16} paddingHorizontal={24}>
        <FontAwesome6 name="calendar-xmark" size={48} color="#EAEAE4" />
        <Text fontSize={16} fontWeight="600" color="#808868">還沒有預約紀錄</Text>
        <Pressable
          onPress={() => router.push('/book/category')}
          style={{
            borderRadius: 9999,
            height: 48,
            paddingHorizontal: 24,
            backgroundColor: '#1F2723',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Text fontSize={16} fontWeight="700" color="#FBFBF8">開始預約</Text>
          <FontAwesome6 name="chevron-right" size={14} color="rgba(251,251,248,0.4)" />
        </Pressable>
      </YStack>
    )
  }

  const sections = splitBookings(bookings)

  return (
    <YStack flex={1} backgroundColor="$background">
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 80,
        }}
        stickySectionHeadersEnabled
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1F2723" />
        }
        ListHeaderComponent={
          <Text fontSize={24} fontWeight="700" color="#1F2723" paddingBottom={20}>
            我的預約
          </Text>
        }
        renderSectionHeader={({ section }) => (
          <View backgroundColor="$background" paddingVertical={8}>
            <Text fontSize={14} fontWeight="600" color="#808868">
              {section.title}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View paddingBottom={12}>
            <BookingCard booking={item} />
          </View>
        )}
        SectionSeparatorComponent={() => <View height={8} />}
      />
    </YStack>
  )
}
