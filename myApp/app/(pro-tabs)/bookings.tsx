// app/(pro-tabs)/bookings.tsx
import { useCallback, useState } from 'react'
import { SectionList, Pressable, RefreshControl, ActivityIndicator, View } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'

import { BookingCardPro } from '@/components/pro/BookingCardPro'
import { fetchProBookings } from '@/lib/pro-bookings-api'
import { splitProBookings } from '@/lib/pro-helpers'
import type { ProBookingListItem } from '@/types/pro'

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

function groupByDate(items: ProBookingListItem[]) {
  const map = new Map<string, ProBookingListItem[]>()
  for (const item of items) {
    const d = new Date(item.starts_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return Array.from(map.entries()).map(([key, data]) => ({
    title: getDateLabel(data[0].starts_at),
    data,
  }))
}

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
      <YStack flex={1} justifyContent="center" alignItems="center" paddingBottom={80} backgroundColor="#FBFBF8">
        <ActivityIndicator size="large" color="#1F2723" />
      </YStack>
    )
  }

  const { upcoming, past } = splitProBookings(bookings)
  const data = activeTab === 'upcoming' ? upcoming : past
  const sections = groupByDate(data)

  return (
    <YStack flex={1} backgroundColor="#FBFBF8">
      {/* Header */}
      <YStack paddingTop={insets.top + 21} paddingHorizontal={20} paddingBottom={20}>
        <Text fontSize={24} fontWeight="700" lineHeight={32} color="#1F2723">
          預約管理
        </Text>
      </YStack>

      {/* Tab bar */}
      <XStack
        marginHorizontal={20}
        marginBottom={12}
      >
        <TabPill label="即將到來" count={upcoming.length} active={activeTab === 'upcoming'} onPress={() => setActiveTab('upcoming')} />
        <TabPill label="歷史紀錄" active={activeTab === 'history'} onPress={() => setActiveTab('history')} />
      </XStack>

      {/* List */}
      {data.length === 0 ? (
        <YStack flex={1} justifyContent="center" alignItems="center" paddingHorizontal={24} paddingBottom={80}>
          <Text fontSize={14} color="#626765" textAlign="center">
            {activeTab === 'upcoming' ? '目前沒有即將到來的預約' : '還沒有歷史紀錄'}
          </Text>
        </YStack>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 100,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#1F2723" />
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
            <BookingCardPro booking={item} onActionComplete={load} />
          )}
        />
      )}
    </YStack>
  )
}

function TabPill({ label, count, active, onPress }: { label: string; count?: number; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderBottomWidth: 2,
        borderBottomColor: active ? '#FF5A3C' : '#E8E9E9',
        opacity: !active && pressed ? 0.5 : 1,
      })}
    >
      <Text fontSize={16} fontWeight={active ? '700' : '500'} color={active ? '#1F2723' : '#626765'}>
        {label}
      </Text>
      {count != null && count > 0 && (
        <View style={{ backgroundColor: '#E8E9E9', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
          <Text fontSize={11} fontWeight="600" color="#8F9391">{count}</Text>
        </View>
      )}
    </Pressable>
  )
}
