import { useState, useCallback } from 'react'
import { SectionList, Pressable, ActivityIndicator, RefreshControl, Modal } from 'react-native'
import { YStack, XStack, Text, View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { AppIcon } from '@/components/AppIcon'

import { BookingCard } from '@/components/booking/BookingCard'
import { BookingDetailSheet } from '@/components/booking/BookingDetailSheet'
import { fetchBookings } from '@/lib/bookings-api'
import type { BookingListItem } from '@/types/booking-list'

type Tab = 'upcoming' | 'history'

const WEEKDAYS_ZH = ['日', '一', '二', '三', '四', '五', '六']

function getDateLabel(isoString: string): string {
  const d = new Date(isoString)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000)
  const dateStr = `${d.getMonth() + 1}/${d.getDate()} 週${WEEKDAYS_ZH[d.getDay()]}`
  if (diff === 0) return `${dateStr}（今天）`
  if (diff === 1) return `${dateStr}（明天）`
  if (diff === -1) return `${dateStr}（昨天）`
  return dateStr
}

function groupByDate(items: BookingListItem[]) {
  const map = new Map<string, BookingListItem[]>()
  for (const item of items) {
    const d = new Date(item.starts_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return Array.from(map.entries()).map(([, data]) => ({
    title: getDateLabel(data[0].starts_at),
    data,
  }))
}

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

  upcoming.sort((a, b) => (a.starts_at ?? '').localeCompare(b.starts_at ?? ''))
  history.sort((a, b) => (b.starts_at ?? '').localeCompare(a.starts_at ?? ''))

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
    } catch (e: unknown) {
      const msg = (e as any)?.message ?? '載入失敗'
      console.error('[Bookings] fetchBookings error:', e)
      setError(msg)
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

  const { upcoming, history } = splitBookings(bookings)
  const data = activeTab === 'upcoming' ? upcoming : history
  const sections = groupByDate(data)

  function renderContent() {
    if (loading && !refreshing) {
      return (
        <YStack flex={1} justifyContent="center" alignItems="center" paddingBottom={80}>
          <ActivityIndicator size="large" color="#1F2723" />
        </YStack>
      )
    }
    if (error) {
      return (
        <YStack flex={1} justifyContent="center" alignItems="center" gap={16} paddingHorizontal={24} paddingBottom={80}>
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
    if (bookings.length === 0) {
      return (
        <YStack flex={1} justifyContent="center" alignItems="center" gap={16} paddingHorizontal={24} paddingBottom={80}>
          <AppIcon name="calendarCancel" size={48} color="#E8E9E9" />
          <Text fontSize={16} fontWeight="600" color="#626765" textAlign="center">還沒有預約紀錄</Text>
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
            <AppIcon name="forward" size={14} color="rgba(251,251,248,0.4)" />
          </Pressable>
        </YStack>
      )
    }
    if (data.length === 0) {
      return (
        <YStack flex={1} justifyContent="center" alignItems="center" gap={8} paddingHorizontal={24} paddingBottom={80}>
          <Text fontSize={14} color="#626765" textAlign="center">
            {activeTab === 'upcoming' ? '目前沒有即將到來的預約' : '還沒有歷史紀錄'}
          </Text>
        </YStack>
      )
    }
    return (
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 80,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1F2723" />
        }
        ItemSeparatorComponent={() => (
          <View style={{ height: 1, backgroundColor: '#E8E9E9', marginHorizontal: 16 }} />
        )}
        renderSectionHeader={({ section }) => (
          <View style={{ paddingHorizontal: 20, paddingTop: section === sections[0] ? 12 : 20, paddingBottom: 6, backgroundColor: '#FBFBF8' }}>
            <Text fontSize={13} fontWeight="500" color="#A5A8A7">{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <BookingCard booking={item} onPress={() => setSelectedBookingId(item.id)} />
        )}
      />
    )
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Page title */}
      <YStack paddingTop={insets.top + 21} paddingHorizontal={20} paddingBottom={20}>
        <Text fontSize={24} fontWeight="700" lineHeight={32} color="#1F2723">
          我的預約
        </Text>
      </YStack>

      {/* Underline tab bar */}
      <XStack marginHorizontal={20} marginBottom={12}>
        <TabPill label="即將到來" active={activeTab === 'upcoming'} onPress={() => setActiveTab('upcoming')} />
        <TabPill label="歷史紀錄" active={activeTab === 'history'} onPress={() => setActiveTab('history')} />
      </XStack>

      {renderContent()}

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
        borderBottomColor: active ? '#FF5A3C' : '#E8E9E9',
        opacity: !active && pressed ? 0.5 : 1,
      })}
    >
      <Text fontSize={16} fontWeight={active ? '700' : '500'} color={active ? '#1F2723' : '#626765'}>
        {label}
      </Text>
    </Pressable>
  )
}
