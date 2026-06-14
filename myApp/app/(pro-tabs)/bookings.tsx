// app/(pro-tabs)/bookings.tsx
import { useCallback, useState } from 'react'
import { SectionList, Pressable, RefreshControl, ActivityIndicator, View, StyleSheet } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'

import { BookingCardPro } from '@/components/pro/BookingCardPro'
import { fetchProBookings } from '@/lib/pro-bookings-api'
import { splitProBookings } from '@/lib/pro-helpers'
import type { ProBookingListItem } from '@/types/pro'
import type { BookingStatus } from '@/types/database'

type Tab = 'upcoming' | 'history'

type StatusFilter = 'all' | 'completed' | 'cancelled' | 'no_show'

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' },
  { key: 'no_show', label: '未到場' },
]

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

function matchesStatusFilter(status: BookingStatus, filter: StatusFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'completed') return status === 'completed'
  if (filter === 'cancelled') return status === 'cancelled_pro' || status === 'cancelled_customer' || status === 'cancelled_grace'
  if (filter === 'no_show') return status === 'no_show_customer' || status === 'no_show_pro'
  return true
}

export default function ProBookingsScreen() {
  const insets = useSafeAreaInsets()
  const [bookings, setBookings] = useState<ProBookingListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('upcoming')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

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

  // Apply status filter only on history tab
  const filteredPast = activeTab === 'history'
    ? past.filter(b => matchesStatusFilter(b.status, statusFilter))
    : past

  const data = activeTab === 'upcoming' ? upcoming : filteredPast
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
        marginBottom={activeTab === 'history' ? 0 : 12}
      >
        <TabPill label="即將到來" count={upcoming.length} active={activeTab === 'upcoming'} onPress={() => setActiveTab('upcoming')} />
        <TabPill label="歷史紀錄" active={activeTab === 'history'} onPress={() => setActiveTab('history')} />
      </XStack>

      {/* Status filters — only on history tab */}
      {activeTab === 'history' && (
        <XStack marginHorizontal={20} marginTop={8} marginBottom={12} gap={8}>
          {STATUS_FILTERS.map(f => (
            <Pressable
              key={f.key}
              onPress={() => setStatusFilter(f.key)}
              style={({ pressed }) => [
                filterStyles.chip,
                statusFilter === f.key && filterStyles.chipActive,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text
                fontSize={13}
                fontWeight={statusFilter === f.key ? '600' : '400'}
                color={statusFilter === f.key ? '#FFFFFF' : '#8F9391'}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </XStack>
      )}

      {/* List */}
      {data.length === 0 ? (
        <YStack flex={1} justifyContent="center" alignItems="center" paddingHorizontal={24} paddingBottom={80}>
          <Text fontSize={14} color="#8F9391" textAlign="center">
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
      <Text fontSize={16} fontWeight={active ? '700' : '500'} color={active ? '#1F2723' : '#8F9391'}>
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

const filterStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F6F4EF',
    borderWidth: 1,
    borderColor: '#E8E9E9',
  },
  chipActive: {
    backgroundColor: '#1F2723',
    borderColor: '#1F2723',
  },
})
