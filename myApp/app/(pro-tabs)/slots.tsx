// app/(pro-tabs)/slots.tsx
import { useCallback, useState } from 'react'
import { FlatList, Pressable, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'

import { SlotRow } from '@/components/pro/SlotRow'
import { fetchSlots, openSlot, closeSlot } from '@/lib/slots-api'
import type { SlotItem } from '@/types/pro'

type DayTab = 0 | 1 | 2

const DAY_LABELS = ['今天', '明天', '後天']

function getDateStr(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const month = d.getMonth() + 1
  const day = d.getDate()
  return `${month}/${day}`
}

function getSlotDay(startsAt: string, refDate: Date): number {
  const slotDate = new Date(startsAt).toDateString()
  const ref = new Date(refDate)
  for (let i = 0; i < 3; i++) {
    const check = new Date(ref)
    check.setDate(check.getDate() + i)
    if (check.toDateString() === slotDate) return i
  }
  return -1
}

export default function ProSlotsScreen() {
  const insets = useSafeAreaInsets()
  const [slots, setSlots] = useState<SlotItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeDay, setActiveDay] = useState<DayTab>(0)

  const load = useCallback(async () => {
    const data = await fetchSlots()
    setSlots(data)
    setLoading(false)
    setRefreshing(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      load()
    }, [load])
  )

  async function handleToggle(startsAt: string) {
    const slot = slots.find((s) => s.starts_at === startsAt)
    if (!slot) return

    if (slot.state === 'open') {
      await closeSlot(startsAt)
    } else if (slot.state === 'available') {
      await openSlot(startsAt)
    }
    load()
  }

  const now = new Date()
  const daySlots = slots.filter((s) => getSlotDay(s.starts_at, now) === activeDay)

  const WEEKDAYS_ZH = ['日', '一', '二', '三', '四', '五', '六']
  const dateRange = `週${WEEKDAYS_ZH[new Date().getDay()]} ${getDateStr(0)} — ${getDateStr(2)}`

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
      <YStack paddingTop={insets.top + 20} paddingHorizontal={20} paddingBottom={12}>
        <Text fontSize={22} fontWeight="700" color="#141413" lineHeight={30}>時段管理</Text>
        <Text fontSize={13} color="#858279" marginTop={2}>{dateRange}</Text>
      </YStack>

      {/* Day tabs */}
      <XStack
        marginHorizontal={16}
        marginBottom={8}
        borderBottomWidth={1}
        borderBottomColor="#EAEAE4"
      >
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

      {/* Slot list */}
      <FlatList
        data={daySlots}
        keyExtractor={(item) => item.starts_at}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 4,
          paddingBottom: insets.bottom + 100,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#141413" />
        }
        renderItem={({ item }) => (
          <SlotRow slot={item} onToggle={handleToggle} />
        )}
      />
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
})
