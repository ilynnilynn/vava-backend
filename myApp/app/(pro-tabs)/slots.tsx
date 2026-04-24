// app/(pro-tabs)/slots.tsx
import { useCallback, useState } from 'react'
import { ScrollView, Pressable, RefreshControl, ActivityIndicator, StyleSheet, View } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'

import { FA6ProIcon } from '@/components/FA6ProIcon'
import { fetchProBookings } from '@/lib/pro-bookings-api'
import { fetchSlots, openSlot, closeSlot } from '@/lib/slots-api'
import type { ProBookingListItem, SlotItem, SlotState } from '@/types/pro'

// ── Constants ─────────────────────────────────────────────────
type DayTab = 0 | 1 | 2

const DAY_LABELS = ['今天', '明天', '後天']
const WEEKDAYS_ZH = ['日', '一', '二', '三', '四', '五', '六']

const HOUR_HEIGHT = 80   // px per hour
const START_HOUR = 9
const END_HOUR = 20
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i)
const SLOT_HEIGHT = HOUR_HEIGHT / 4  // 15 min = 20px

const SLOT_CONFIG: Record<SlotState, { bg: string; border: string; text: string; label: string }> = {
  expired:   { bg: 'transparent', border: 'transparent', text: '#bbb',    label: '' },
  available: { bg: '#FBFBF8',     border: '#E0E0D8',     text: '#aaa',    label: '+ 開放' },
  open:      { bg: '#ede9fe',     border: '#c4b5fd',     text: '#7c3aed', label: '開放中' },
  booked:    { bg: '#dcfce7',     border: '#86efac',     text: '#15803d', label: '已預約' },
}

// ── Helpers ───────────────────────────────────────────────────
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

function timeToY(isoString: string): number {
  const d = new Date(isoString)
  return (d.getHours() + d.getMinutes() / 60 - START_HOUR) * HOUR_HEIGHT
}

function durationToHeight(startsAt: string, endsAt: string): number {
  const ms = new Date(endsAt).getTime() - new Date(startsAt).getTime()
  return (ms / 3_600_000) * HOUR_HEIGHT
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('zh-TW', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

// ── Screen ────────────────────────────────────────────────────
export default function ProSlotsScreen() {
  const insets = useSafeAreaInsets()
  const [bookings, setBookings] = useState<ProBookingListItem[]>([])
  const [slots, setSlots] = useState<SlotItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeDay, setActiveDay] = useState<DayTab>(0)
  const [editMode, setEditMode] = useState(false)

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
  const dayBookings = bookings.filter(b => b.starts_at.slice(0, 10) === dateKey)
  const daySlots = slots.filter(s => getSlotDay(s.starts_at, now) === activeDay)
  const gridHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT

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
          onPress={() => setEditMode(e => !e)}
          accessibilityLabel={editMode ? '結束編輯' : '管理時段'}
          style={({ pressed }) => [
            styles.editBtn,
            editMode && styles.editBtnActive,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <FA6ProIcon name="pen" size={18} color={editMode ? '#fff' : '#141413'} weight="regular" />
        </Pressable>
      </XStack>

      {/* Day tabs */}
      <XStack marginHorizontal={16} borderBottomWidth={1} borderBottomColor="#EAEAE4">
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

      {/* Time grid */}
      <ScrollView
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load() }}
            tintColor="#141413"
          />
        }
      >
        <XStack>
          {/* Hour labels */}
          <View style={styles.timeCol}>
            {HOURS.map(h => (
              <View key={h} style={styles.hourLabelRow}>
                <Text style={styles.hourLabel}>{String(h).padStart(2, '0')}:00</Text>
              </View>
            ))}
          </View>

          {/* Grid */}
          <View style={[styles.grid, { height: gridHeight }]}>
            {/* Hour lines */}
            {HOURS.map(h => (
              <View
                key={h}
                style={[styles.hourLine, { top: (h - START_HOUR) * HOUR_HEIGHT }]}
              />
            ))}

            {/* Normal mode — booking blocks */}
            {!editMode && dayBookings.map(b => {
              const top = timeToY(b.starts_at)
              const height = Math.max(durationToHeight(b.starts_at, b.ends_at), 36)
              return (
                <View key={b.id} style={[styles.bookingBlock, { top, height }]}>
                  <Text fontSize={12} fontWeight="700" color="#141413" numberOfLines={1} lineHeight={16}>
                    {formatTime(b.starts_at)}  {b.client_display_name}
                  </Text>
                  {height > 40 && (
                    <Text fontSize={11} color="#858279" numberOfLines={1} lineHeight={15} marginTop={1}>
                      {b.service_label}
                    </Text>
                  )}
                </View>
              )
            })}

            {/* Edit mode — slot pills */}
            {editMode && daySlots.map(s => {
              if (s.state === 'expired') return null
              const cfg = SLOT_CONFIG[s.state]
              const top = timeToY(s.starts_at)
              const isLocked = s.state === 'booked'
              return (
                <Pressable
                  key={s.starts_at}
                  onPress={() => !isLocked && handleToggle(s.starts_at)}
                  disabled={isLocked}
                  style={({ pressed }) => [
                    styles.slotBlock,
                    {
                      top,
                      height: SLOT_HEIGHT - 1,
                      backgroundColor: cfg.bg,
                      borderColor: cfg.border,
                      opacity: pressed && !isLocked ? 0.7 : 1,
                    },
                  ]}
                >
                  {s.state !== 'available' && (
                    <Text fontSize={9} color={cfg.text} numberOfLines={1}>{cfg.label}</Text>
                  )}
                </Pressable>
              )
            })}
          </View>
        </XStack>
      </ScrollView>
    </YStack>
  )
}

const styles = StyleSheet.create({
  editBtn: {
    padding: 8,
    borderRadius: 8,
  },
  editBtnActive: {
    backgroundColor: '#141413',
  },
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
  timeCol: {
    width: 52,
  },
  hourLabelRow: {
    height: HOUR_HEIGHT,
    justifyContent: 'flex-start',
    paddingTop: 4,
    paddingLeft: 8,
  },
  hourLabel: {
    fontSize: 11,
    color: '#aaa',
  },
  grid: {
    flex: 1,
    position: 'relative',
    marginRight: 16,
  },
  hourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#EAEAE4',
  },
  bookingBlock: {
    position: 'absolute',
    left: 2,
    right: 0,
    backgroundColor: '#F0EBE5',
    borderLeftWidth: 3,
    borderLeftColor: '#c96442',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  slotBlock: {
    position: 'absolute',
    left: 2,
    right: 0,
    borderRadius: 3,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
})
