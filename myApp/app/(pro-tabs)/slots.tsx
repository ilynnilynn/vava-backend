// app/(pro-tabs)/slots.tsx
import { useCallback, useState } from 'react'
import { FlatList, Modal, Pressable, RefreshControl, ActivityIndicator, StyleSheet, View } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'

import { BookingCardPro } from '@/components/pro/BookingCardPro'
import { SlotRow } from '@/components/pro/SlotRow'
import { FA6ProIcon } from '@/components/FA6ProIcon'
import { fetchProBookings } from '@/lib/pro-bookings-api'
import { fetchSlots, openSlot, closeSlot } from '@/lib/slots-api'
import type { ProBookingListItem, SlotItem } from '@/types/pro'

type DayTab = 0 | 1 | 2

const DAY_LABELS = ['今天', '明天', '後天']
const WEEKDAYS_ZH = ['日', '一', '二', '三', '四', '五', '六']

function getDateStr(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function getDateKey(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

function getSlotDay(startsAt: string, now: Date): number {
  const slotDate = new Date(startsAt).toDateString()
  for (let i = 0; i < 3; i++) {
    const check = new Date(now)
    check.setDate(check.getDate() + i)
    if (check.toDateString() === slotDate) return i
  }
  return -1
}

export default function ProSlotsScreen() {
  const insets = useSafeAreaInsets()
  const [bookings, setBookings] = useState<ProBookingListItem[]>([])
  const [slots, setSlots] = useState<SlotItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeDay, setActiveDay] = useState<DayTab>(0)
  const [slotModalVisible, setSlotModalVisible] = useState(false)

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

  async function handleToggle(startsAt: string) {
    const slot = slots.find(s => s.starts_at === startsAt)
    if (!slot) return
    if (slot.state === 'open') await closeSlot(startsAt)
    else if (slot.state === 'available') await openSlot(startsAt)
    load()
  }

  if (loading && !refreshing) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="#FBFBF8">
        <ActivityIndicator size="large" color="#141413" />
      </YStack>
    )
  }

  const now = new Date()
  const dateKey = getDateKey(activeDay)
  const dayBookings = bookings
    .filter(b => b.starts_at.slice(0, 10) === dateKey)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  const modalDaySlots = slots.filter(s => getSlotDay(s.starts_at, now) === activeDay)

  return (
    <YStack flex={1} backgroundColor="#FBFBF8">
      {/* Header */}
      <XStack paddingTop={insets.top + 20} paddingHorizontal={20} paddingBottom={12} alignItems="center">
        <YStack flex={1}>
          <Text fontSize={22} fontWeight="700" color="#141413" lineHeight={30}>預約</Text>
          <Text fontSize={13} color="#858279" marginTop={2}>
            週{WEEKDAYS_ZH[now.getDay()]} {getDateStr(0)} — {getDateStr(2)}
          </Text>
        </YStack>
        <Pressable
          onPress={() => setSlotModalVisible(true)}
          accessibilityLabel="管理時段"
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}
        >
          <FA6ProIcon name="pen-to-square" size={20} color="#141413" />
        </Pressable>
      </XStack>

      {/* Day tabs */}
      <XStack marginHorizontal={16} marginBottom={8} borderBottomWidth={1} borderBottomColor="#EAEAE4">
        {DAY_LABELS.map((label, i) => (
          <Pressable
            key={i}
            onPress={() => setActiveDay(i as DayTab)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeDay === i }}
            style={[styles.dayTab, activeDay === i && styles.dayTabActive]}
          >
            <Text fontSize={14} fontWeight={activeDay === i ? '700' : '500'} color={activeDay === i ? '#141413' : '#858279'}>
              {label}
            </Text>
            <Text fontSize={11} color={activeDay === i ? '#141413' : '#aaa'}>{getDateStr(i)}</Text>
          </Pressable>
        ))}
      </XStack>

      {/* Booking list */}
      <FlatList
        data={dayBookings}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load() }}
            tintColor="#141413"
          />
        }
        ListEmptyComponent={
          <YStack paddingVertical={48} alignItems="center">
            <Text fontSize={14} color="#858279">這天沒有預約</Text>
          </YStack>
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <BookingCardPro booking={item} onActionComplete={load} />
          </View>
        )}
      />

      {/* Slot management modal */}
      <Modal
        visible={slotModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSlotModalVisible(false)}
      >
        <YStack flex={1} backgroundColor="#FBFBF8">
          <XStack paddingTop={20} paddingHorizontal={20} paddingBottom={12} alignItems="center">
            <Text flex={1} fontSize={18} fontWeight="700" color="#141413" lineHeight={26}>時段管理</Text>
            <Pressable
              onPress={() => setSlotModalVisible(false)}
              accessibilityLabel="關閉"
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}
            >
              <FA6ProIcon name="xmark" size={20} color="#141413" />
            </Pressable>
          </XStack>

          <XStack marginHorizontal={16} marginBottom={8} borderBottomWidth={1} borderBottomColor="#EAEAE4">
            {DAY_LABELS.map((label, i) => (
              <Pressable
                key={i}
                onPress={() => setActiveDay(i as DayTab)}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeDay === i }}
                style={[styles.dayTab, activeDay === i && styles.dayTabActive]}
              >
                <Text fontSize={14} fontWeight={activeDay === i ? '700' : '500'} color={activeDay === i ? '#141413' : '#858279'}>
                  {label}
                </Text>
                <Text fontSize={11} color={activeDay === i ? '#141413' : '#aaa'}>{getDateStr(i)}</Text>
              </Pressable>
            ))}
          </XStack>

          <FlatList
            data={modalDaySlots}
            keyExtractor={item => item.starts_at}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 }}
            renderItem={({ item }) => <SlotRow slot={item} onToggle={handleToggle} />}
          />
        </YStack>
      </Modal>
    </YStack>
  )
}

const styles = StyleSheet.create({
  dayTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    gap: 2,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  dayTabActive: {
    borderBottomColor: '#141413',
  },
  cardWrap: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#F5F5F0',
    borderRadius: 12,
    overflow: 'hidden',
  },
})
