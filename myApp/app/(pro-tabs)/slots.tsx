// app/(pro-tabs)/slots.tsx
import { useCallback, useState } from 'react'
import { ScrollView, Pressable, RefreshControl, ActivityIndicator, StyleSheet, View } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'

import { AppIcon } from '@/components/AppIcon'
import { fetchProBookings } from '@/lib/pro-bookings-api'
import { fetchSlots, openSlot, closeSlot } from '@/lib/slots-api'
import { SlotActionsSheet } from '@/components/pro/SlotActionsSheet'
import type { ProBookingListItem, SlotItem, SlotState } from '@/types/pro'

// ── Constants ─────────────────────────────────────────────────
type DayTab = 0 | 1 | 2

const DAY_LABELS = ['今天', '明天', '後天']
const WEEKDAYS_ZH = ['日', '一', '二', '三', '四', '五', '六']

const HOUR_HEIGHT = 96   // px per hour
const DEFAULT_START_HOUR = 11
const DEFAULT_END_HOUR = 20
const SLOT_HEIGHT = HOUR_HEIGHT / 2  // 30 min = 40px

const BADGE_COLORS = ['#A8AFFF', '#808868', '#FF5A3C', '#DFF5AD']

const SLOT_CONFIG: Record<SlotState, { bg: string; border: string; text: string; label: string }> = {
  expired:   { bg: 'rgba(232,233,233,0.2)', border: '#E8E9E9', text: '#BBBEBD', label: '已過期' },
  available: { bg: '#FBFBF8',     border: '#E8E9E9',     text: '#8F9391', label: '可新增' },
  open:      { bg: 'rgba(236,240,228,0.8)', border: 'rgba(129,178,17,0.4)', text: '#81B211', label: '開放中' },
  booked:    { bg: '#F5F5FF',     border: '#A8AFFF',     text: '#7D85E7', label: '已預約' },
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
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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

function timeToY(isoString: string, gridStartHour: number): number {
  const d = new Date(isoString)
  return (d.getHours() + d.getMinutes() / 60 - gridStartHour) * HOUR_HEIGHT
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
  const [showActions, setShowActions] = useState(false)
  const [dayHours, setDayHours] = useState<Record<DayTab, { start: number; end: number }>>({
    0: { start: DEFAULT_START_HOUR, end: DEFAULT_END_HOUR },
    1: { start: DEFAULT_START_HOUR, end: DEFAULT_END_HOUR },
    2: { start: DEFAULT_START_HOUR, end: DEFAULT_END_HOUR },
  })

  const startHour = dayHours[activeDay].start
  const endHour = dayHours[activeDay].end
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i)

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

  const now = new Date()
  const dateKey = getDateKey(activeDay)
  const dayBookings = bookings.filter(b => {
    const bd = new Date(b.starts_at)
    const key = `${bd.getFullYear()}-${String(bd.getMonth() + 1).padStart(2, '0')}-${String(bd.getDate()).padStart(2, '0')}`
    return key === dateKey
  })
  const apiDaySlots = slots.filter(s => {
    if (getSlotDay(s.starts_at, now) !== activeDay) return false
    const m = new Date(s.starts_at).getMinutes()
    return m === 0 || m === 30
  })

  // Fill empty slots for the full grid range so expanded hours have tappable slots
  const daySlots: SlotItem[] = (() => {
    const existing = new Map(apiDaySlots.map(s => [s.starts_at, s]))
    const result: SlotItem[] = []
    const dayBase = new Date(now)
    dayBase.setDate(dayBase.getDate() + activeDay)
    dayBase.setHours(startHour, 0, 0, 0)

    const totalSlots = (endHour - startHour) * 2 // 30-min intervals
    for (let i = 0; i <= totalSlots; i++) {
      const t = new Date(dayBase.getTime() + i * 30 * 60_000)
      const iso = t.toISOString()
      const match = existing.get(iso)
      if (match) {
        result.push(match)
      } else {
        // Synthetic available slot for empty grid positions
        result.push({ starts_at: iso, state: t < now ? 'expired' : 'available' })
      }
    }
    return result
  })()
  const gridHeight = (endHour - startHour) * HOUR_HEIGHT + SLOT_HEIGHT

  async function handleToggle(startsAt: string) {
    const slot = slots.find(s => s.starts_at === startsAt)
      ?? daySlots.find(s => s.starts_at === startsAt)
    if (!slot) return
    try {
      if (slot.state === 'open') await closeSlot(startsAt)
      else if (slot.state === 'available') await openSlot(startsAt)
    } catch (e) {
      console.warn('[slots] toggle failed:', e)
    }
    load()
  }

  async function handleOpenAll() {
    try {
      const toOpen = daySlots.filter(s => s.state === 'available')
      for (const s of toOpen) await openSlot(s.starts_at)
    } catch (e) {
      console.warn('[slots] openAll failed:', e)
    }
    load()
  }

  async function handleCloseAll() {
    try {
      const toClose = daySlots.filter(s => s.state === 'open')
      for (const s of toClose) await closeSlot(s.starts_at)
    } catch (e) {
      console.warn('[slots] closeAll failed:', e)
    }
    load()
  }

  function handleSetOpenHours(start: number, end: number) {
    if (end <= start) return // invalid range, ignore
    setDayHours(prev => ({ ...prev, [activeDay]: { start, end } }))
  }

  // Day summary: compute open range and status
  const openSlots = daySlots.filter(s => s.state === 'open')
  const isDayOpen = openSlots.length > 0
  const dayStatusLabel = isDayOpen ? '營業中' : '已關閉'

  const fmtH = (h: number) => `${String(h).padStart(2, '0')}:00`
  const dayTimeRange = `${fmtH(startHour)} – ${fmtH(endHour)}`

  if (loading && !refreshing) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="#FBFBF8">
        <ActivityIndicator size="large" color="#1F2723" />
      </YStack>
    )
  }

  return (
    <YStack flex={1} backgroundColor="#FBFBF8">
      {/* Header */}
      <XStack paddingTop={insets.top + 20} paddingHorizontal={20} paddingBottom={12} alignItems="center">
        <YStack flex={1}>
          <Text fontSize={24} fontWeight="700" color="#1F2723" lineHeight={32}>時段管理</Text>
          <Text fontSize={14} color="#626765" marginTop={2}>
            {now.getFullYear()} {now.getMonth() + 1}月{now.getDate()}-{new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2).getDate()}
          </Text>
        </YStack>
        <Pressable
          onPress={() => setEditMode(e => !e)}
          accessibilityLabel={editMode ? '結束編輯' : '管理時段'}
          style={[
            styles.editBtn,
            editMode && styles.editBtnActive,
          ]}
        >
          <AppIcon name="edit" size={18} color="#626765" weight="regular" />
        </Pressable>
      </XStack>

      {/* Day tabs */}
      <XStack marginHorizontal={20}>
        {DAY_LABELS.map((label, i) => {
          const d = new Date()
          d.setDate(d.getDate() + i)
          const dateNum = d.getDate()
          const weekday = `週${WEEKDAYS_ZH[d.getDay()]}`
          const active = activeDay === i
          return (
            <Pressable
              key={i}
              onPress={() => setActiveDay(i as DayTab)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.dayTab, active && styles.dayTabActive]}
            >
              <Text fontSize={18} fontWeight={active ? '700' : '500'} color={active ? '#1F2723' : '#626765'}>
                {dateNum}
              </Text>
              <Text fontSize={12} color={active ? '#1F2723' : '#A5A8A7'}>
                {weekday}
              </Text>
            </Pressable>
          )
        })}
      </XStack>

      {/* Day summary card */}
      <XStack
        marginHorizontal={20}
        marginTop={12}
        marginBottom={12}
        paddingVertical={10}
        paddingHorizontal={12}
        alignItems="center"
        backgroundColor="#FBFBF8"
        borderRadius={8}
        borderWidth={1}
        borderColor="#E8E9E9"
      >
        <YStack flex={1} gap={4}>
          <Text fontSize={14} fontWeight="400" color="#1F2723">
            {DAY_LABELS[activeDay]} {getDateStr(activeDay)} 週{WEEKDAYS_ZH[new Date(new Date().setDate(new Date().getDate() + activeDay)).getDay()]}
          </Text>
          <XStack alignItems="center" gap={6}>
            <View style={[styles.statusDot, isDayOpen && styles.statusDotOpen]} />
            <Text fontSize={13} color="#626765">
              {dayStatusLabel}{dayTimeRange !== '' ? `．${dayTimeRange}` : ''}
            </Text>
          </XStack>
        </YStack>
        <Pressable
            onPress={() => setShowActions(true)}
            accessibilityRole="button"
            accessibilityLabel="更多操作"
            hitSlop={8}
            style={({ pressed }) => ({ padding: 6, opacity: pressed ? 0.7 : 1 })}
          >
            <AppIcon name="ellipsis" size={18} color="#A5A8A7" />
          </Pressable>
      </XStack>

      {/* Time grid */}
      <ScrollView
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load() }}
            tintColor="#1F2723"
          />
        }
      >
        <XStack>
          {/* Hour labels */}
          <View style={styles.timeCol}>
            {hours.map(h => (
              <View key={h} style={styles.hourLabelRow}>
                <Text style={styles.hourLabel}>{String(h).padStart(2, '0')}:00</Text>
              </View>
            ))}
          </View>

          {/* Grid */}
          <View style={[styles.grid, { height: gridHeight }]}>
            {/* Hour lines + half-hour lines */}
            {hours.map(h => (
              <View key={h}>
                <View style={[styles.hourLine, { top: (h - startHour) * HOUR_HEIGHT }]} />
                <View style={[styles.halfHourLine, { top: (h - startHour) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }]} />
              </View>
            ))}

            {/* Normal mode — booking blocks */}
            {!editMode && dayBookings.map((b, idx) => {
              const top = timeToY(b.starts_at, startHour)
              const height = Math.max(durationToHeight(b.starts_at, b.ends_at), 36)
              const badgeColor = BADGE_COLORS[idx % BADGE_COLORS.length]
              return (
                <View key={b.id} style={[styles.bookingBlock, { top, height, borderLeftColor: badgeColor, backgroundColor: `${badgeColor}33` }]}>
                  <Text fontSize={15} fontWeight="700" color="#1F2723" numberOfLines={1} lineHeight={22}>
                    {formatTime(b.starts_at)}  {b.client_display_name}
                  </Text>
                  {height > 40 && (
                    <Text fontSize={13} color="#626765" numberOfLines={1} lineHeight={20} marginTop={1}>
                      {b.service_label}
                    </Text>
                  )}
                </View>
              )
            })}

            {/* Edit mode — slot pills */}
            {editMode && daySlots.map(s => {
              const cfg = SLOT_CONFIG[s.state]
              const top = timeToY(s.starts_at, startHour)
              const isLocked = s.state === 'booked' || s.state === 'expired'
              const booking = s.state === 'booked'
                ? dayBookings.find(b => {
                    const bStart = new Date(b.starts_at).getTime()
                    const bEnd = new Date(b.ends_at).getTime()
                    const sStart = new Date(s.starts_at).getTime()
                    return sStart >= bStart && sStart < bEnd
                  })
                : undefined
              return (
                <Pressable
                  key={s.starts_at}
                  onPress={() => !isLocked && handleToggle(s.starts_at)}
                  disabled={isLocked}
                  style={({ pressed }) => [
                    styles.slotBlock,
                    {
                      top,
                      height: SLOT_HEIGHT - 4,
                      backgroundColor: cfg.bg,
                      borderColor: cfg.border,
                      opacity: pressed && !isLocked ? 0.7 : 1,
                    },
                  ]}
                >
                  <XStack flex={1} alignItems="center">
                    <Text fontSize={13} fontWeight="500" color={cfg.text} numberOfLines={1}>{cfg.label}</Text>
                    {s.state === 'available' && (
                      <View style={{ marginLeft: 'auto' }}>
                        <AppIcon name="add" size={14} color="#A5A8A7" />
                      </View>
                    )}
                    {booking && (
                      <Text fontSize={12} fontWeight="400" color="#7D85E7" style={{ marginLeft: 'auto' }}>
                        {formatTime(booking.starts_at)}-{formatTime(booking.ends_at)}
                      </Text>
                    )}
                  </XStack>
                </Pressable>
              )
            })}
          </View>
        </XStack>
      </ScrollView>

      {/* Bottom sheet for bulk actions */}
      <SlotActionsSheet
        visible={showActions}
        onClose={() => setShowActions(false)}
        openHourStart={startHour}
        openHourEnd={endHour}
        onOpenAll={handleOpenAll}
        onCloseAll={handleCloseAll}
        onSetOpenHours={handleSetOpenHours}
      />
    </YStack>
  )
}

const styles = StyleSheet.create({
  editBtn: {
    padding: 10,
    borderRadius: 8,
  },
  editBtnActive: {
    backgroundColor: '#F0EDE5',
  },
  dayTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    gap: 2,
    borderBottomWidth: 2,
    borderBottomColor: '#E8E9E9',
  },
  dayTabActive: {
    borderBottomColor: '#FF5A3C',
  },
  timeCol: {
    width: 52,
  },
  hourLabelRow: {
    height: HOUR_HEIGHT,
    justifyContent: 'flex-start',
    paddingLeft: 8,
  },
  hourLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: '#787D7B',
    marginTop: -8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#A5A8A7',
  },
  statusDotOpen: {
    backgroundColor: '#33CC87',
  },
  moreActionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
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
    backgroundColor: '#D2D3D3',
  },
  halfHourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#D2D3D3',
  },
  bookingBlock: {
    position: 'absolute',
    left: 2,
    right: 0,
    borderLeftWidth: 3,
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
    paddingHorizontal: 12,
  },
})
