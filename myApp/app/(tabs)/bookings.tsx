import { useState, useCallback } from 'react'
import { FlatList, Pressable, ActivityIndicator, RefreshControl, Modal } from 'react-native'
import { YStack, XStack, Text, View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { FA6ProIcon } from '@/components/FA6ProIcon'

import { BookingCard } from '@/components/booking/BookingCard'
import { BookingDetailSheet } from '@/components/booking/BookingDetailSheet'
import { fetchBookings } from '@/lib/bookings-api'
import type { BookingListItem } from '@/types/booking-list'

type Tab = 'upcoming' | 'history'

const UPCOMING_STATUSES = new Set(['confirmed', 'reschedule_pending'])

function splitBookings(bookings: BookingListItem[]) {
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

  return { upcoming, history }
}

export default function BookingsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const [bookings, setBookings] = useState<BookingListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('upcoming')
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)

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
        <Text fontSize={15} color="#626765" textAlign="center">{error}</Text>
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
        <FA6ProIcon name="calendar-xmark" size={48} color="#E8E9E9" />
        <Text fontSize={16} fontWeight="600" color="#626765">還沒有預約紀錄</Text>
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
          <FA6ProIcon name="chevron-right" size={14} color="rgba(251,251,248,0.4)" />
        </Pressable>
      </YStack>
    )
  }

  const { upcoming, history } = splitBookings(bookings)
  const data = activeTab === 'upcoming' ? upcoming : history

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Page title */}
      <YStack paddingTop={insets.top + 21} paddingHorizontal={16} paddingBottom={20}>
        <Text fontSize={20} fontWeight="700" lineHeight={28} color="#1F2723" textAlign="center">
          我的預約
        </Text>
      </YStack>

      {/* Underline tab bar */}
      <XStack
        marginHorizontal={16}
        marginBottom={12}
        borderBottomWidth={1}
        borderBottomColor="#E8E9E9"
      >
        <TabPill label="即將到來" active={activeTab === 'upcoming'} onPress={() => setActiveTab('upcoming')} />
        <TabPill label="歷史紀錄" active={activeTab === 'history'} onPress={() => setActiveTab('history')} />
      </XStack>

      {/* List */}
      {data.length === 0 ? (
        <YStack flex={1} justifyContent="center" alignItems="center" gap={8} paddingHorizontal={24}>
          <Text fontSize={14} color="#626765">
            {activeTab === 'upcoming' ? '目前沒有即將到來的預約' : '還沒有歷史紀錄'}
          </Text>
        </YStack>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 80,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1F2723" />
          }
          ItemSeparatorComponent={() => (
            <View paddingVertical={12}>
              <View height={1} backgroundColor="#E8E9E9" />
            </View>
          )}
          renderItem={({ item }) => (
            <BookingCard booking={item} onPress={() => setSelectedBookingId(item.id)} />
          )}
        />
      )}

      {/* Bottom sheet modal for booking detail */}
      <Modal
        visible={selectedBookingId !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedBookingId(null)}
      >
        {selectedBookingId && (
          <BookingDetailSheet
            bookingId={selectedBookingId}
            onClose={() => { setSelectedBookingId(null); load() }}
          />
        )}
      </Modal>
    </YStack>
  )
}

function TabPill({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
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
        borderBottomColor: active ? '#FF5A3C' : 'transparent',
        opacity: !active && pressed ? 0.5 : 1,
      })}
    >
      <Text fontSize={16} fontWeight={active ? '700' : '500'} color={active ? '#1F2723' : '#626765'}>
        {label}
      </Text>
    </Pressable>
  )
}
