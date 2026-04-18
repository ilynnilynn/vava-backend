# Bookings Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the customer-facing Bookings tab with a two-section list (upcoming + history) and a booking detail screen with status-dependent actions.

**Architecture:** SectionList-based bookings list screen fetches data via `apiPost`, splits into upcoming/history sections, renders minimal booking cards. Tapping a card pushes a detail screen in the root Stack. Mock data used until backend endpoints exist.

**Tech Stack:** Expo Router, Tamagui, React Native SectionList, FontAwesome6, existing `lib/api.ts` + `lib/booking-helpers.ts`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `components/booking/StatusBadge.tsx` | Create | Status label + colored pill |
| `components/booking/BookingCard.tsx` | Create | Minimal booking card for SectionList |
| `lib/bookings-api.ts` | Create | Fetch bookings list + detail, mock data fallback |
| `types/booking-list.ts` | Create | `BookingListItem` + `BookingDetail` types |
| `app/(tabs)/bookings.tsx` | Replace | Bookings list screen with SectionList |
| `app/(tabs)/_layout.tsx` | Modify | Register booking detail stack screen |
| `app/(tabs)/booking/_layout.tsx` | Create | Stack layout for booking detail nested in tabs |
| `app/(tabs)/booking/[id].tsx` | Create | Booking detail screen |
| `app/_layout.tsx` | No change | Root layout unchanged |

**Routing note:** The detail screen lives at `app/(tabs)/booking/[id].tsx` with its own Stack layout. This keeps navigation within the tabs navigator so the tab bar remains visible. The tabs `_layout.tsx` must register the `booking` directory.

---

### Task 1: Types

**Files:**
- Create: `types/booking-list.ts`

- [ ] **Step 1: Create the types file**

```ts
// types/booking-list.ts
import type { BookingStatus } from './database'

export type BookingListItem = {
  id: string
  pro_display_name: string
  service_domain: 'nails' | 'lashes'
  starts_at: string
  status: BookingStatus
}

export type BookingDetail = {
  id: string
  pro_display_name: string
  pro_phone: string | null
  service_domain: 'nails' | 'lashes'
  service_label: string
  starts_at: string
  session_ends_at: string
  studio_address: string
  price_min: number
  price_max: number
  status: BookingStatus
  no_show_window_minutes: number
  customer_late_notified_at: string | null
  created_at: string
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/ilynn/Projects/engineering/vava-backend
git add myApp/types/booking-list.ts
git commit -m "feat(bookings): add BookingListItem and BookingDetail types"
```

---

### Task 2: StatusBadge Component

**Files:**
- Create: `components/booking/StatusBadge.tsx`

- [ ] **Step 1: Create StatusBadge**

```tsx
// components/booking/StatusBadge.tsx
import { Text, View } from 'tamagui'
import type { BookingStatus } from '@/types/database'

const STATUS_CONFIG: Record<BookingStatus, { label: string; bg: string; color: string }> = {
  confirmed:          { label: '已確認',     bg: '#E8F5E9', color: '#2E7D52' },
  reschedule_pending: { label: '改期中',     bg: '#FFF8E1', color: '#F57F17' },
  completed:          { label: '已完成',     bg: '#EAEAE4', color: '#808868' },
  cancelled_grace:    { label: '已取消',     bg: '#FFEBEE', color: '#C62828' },
  cancelled_customer: { label: '已取消',     bg: '#FFEBEE', color: '#C62828' },
  cancelled_pro:      { label: '已取消',     bg: '#FFEBEE', color: '#C62828' },
  no_show_customer:   { label: '未到場',     bg: '#FFEBEE', color: '#C62828' },
  no_show_pro:        { label: '設計師未到', bg: '#FFEBEE', color: '#C62828' },
  rescheduled:        { label: '已改期',     bg: '#EAEAE4', color: '#808868' },
  expired:            { label: '已過期',     bg: '#EAEAE4', color: '#808868' },
}

type Props = {
  status: BookingStatus
}

export function StatusBadge({ status }: Props) {
  const config = STATUS_CONFIG[status]
  return (
    <View
      backgroundColor={config.bg}
      borderRadius={9999}
      paddingHorizontal={8}
      paddingVertical={2}
      alignSelf="flex-start"
    >
      <Text fontSize={12} fontWeight="600" color={config.color}>
        {config.label}
      </Text>
    </View>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/ilynn/Projects/engineering/vava-backend
git add myApp/components/booking/StatusBadge.tsx
git commit -m "feat(bookings): add StatusBadge component"
```

---

### Task 3: BookingCard Component

**Files:**
- Create: `components/booking/BookingCard.tsx`

- [ ] **Step 1: Create BookingCard**

```tsx
// components/booking/BookingCard.tsx
import { Pressable } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useRouter } from 'expo-router'

import { StatusBadge } from './StatusBadge'
import { formatBookingDate, formatSlotTime } from '@/lib/booking-helpers'
import type { BookingListItem } from '@/types/booking-list'

type Props = {
  booking: BookingListItem
}

export function BookingCard({ booking }: Props) {
  const router = useRouter()

  const domainLabel = booking.service_domain === 'nails' ? '美甲' : '美睫'
  const dateLabel = formatBookingDate(booking.starts_at)
  const timeLabel = formatSlotTime(booking.starts_at)

  return (
    <Pressable onPress={() => router.push(`/booking/${booking.id}`)}>
      <YStack
        backgroundColor="#F0EDE5"
        borderRadius={12}
        padding={16}
        gap={8}
      >
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={16} fontWeight="700" color="#1F2723">
            {booking.pro_display_name}
          </Text>
          <StatusBadge status={booking.status} />
        </XStack>
        <Text fontSize={14} color="#808868">
          {domainLabel}
        </Text>
        <Text fontSize={14} color="#808868">
          {dateLabel} {timeLabel}
        </Text>
      </YStack>
    </Pressable>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/ilynn/Projects/engineering/vava-backend
git add myApp/components/booking/BookingCard.tsx
git commit -m "feat(bookings): add BookingCard component"
```

---

### Task 4: Bookings API + Mock Data

**Files:**
- Create: `lib/bookings-api.ts`

- [ ] **Step 1: Create bookings-api with mock fallback**

```ts
// lib/bookings-api.ts
import { apiPost } from './api'
import type { BookingListItem, BookingDetail } from '@/types/booking-list'

// ── Mock data (remove when backend endpoints exist) ─────────

const now = new Date()
const tomorrow = new Date(now)
tomorrow.setDate(tomorrow.getDate() + 1)
const yesterday = new Date(now)
yesterday.setDate(yesterday.getDate() - 1)
const lastWeek = new Date(now)
lastWeek.setDate(lastWeek.getDate() - 7)

const MOCK_BOOKINGS: BookingListItem[] = [
  {
    id: 'mock-1',
    pro_display_name: 'Mia',
    service_domain: 'nails',
    starts_at: tomorrow.toISOString(),
    status: 'confirmed',
  },
  {
    id: 'mock-2',
    pro_display_name: 'Yuki',
    service_domain: 'lashes',
    starts_at: yesterday.toISOString(),
    status: 'completed',
  },
  {
    id: 'mock-3',
    pro_display_name: 'Hana',
    service_domain: 'nails',
    starts_at: lastWeek.toISOString(),
    status: 'cancelled_customer',
  },
]

const MOCK_DETAIL: BookingDetail = {
  id: 'mock-1',
  pro_display_name: 'Mia',
  pro_phone: null,
  service_domain: 'nails',
  service_label: '凝膠・單色',
  starts_at: tomorrow.toISOString(),
  session_ends_at: new Date(tomorrow.getTime() + 90 * 60 * 1000).toISOString(),
  studio_address: '台北市大安區忠孝東路四段100號',
  price_min: 800,
  price_max: 1200,
  status: 'confirmed',
  no_show_window_minutes: 15,
  customer_late_notified_at: null,
  created_at: now.toISOString(),
}

// ── API functions ───────────────────────────────────────────

const USE_MOCK = true // flip to false when backend is ready

export async function fetchBookings(): Promise<BookingListItem[]> {
  if (USE_MOCK) return MOCK_BOOKINGS
  return apiPost<BookingListItem[]>('/api/bookings/list', {})
}

export async function fetchBookingDetail(bookingId: string): Promise<BookingDetail> {
  if (USE_MOCK) {
    const found = MOCK_BOOKINGS.find((b) => b.id === bookingId)
    return {
      ...MOCK_DETAIL,
      id: bookingId,
      pro_display_name: found?.pro_display_name ?? MOCK_DETAIL.pro_display_name,
      status: found?.status ?? MOCK_DETAIL.status,
      starts_at: found?.starts_at ?? MOCK_DETAIL.starts_at,
      service_domain: found?.service_domain ?? MOCK_DETAIL.service_domain,
    }
  }
  return apiPost<BookingDetail>('/api/bookings/detail', { bookingId })
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/ilynn/Projects/engineering/vava-backend
git add myApp/lib/bookings-api.ts
git commit -m "feat(bookings): add bookings API with mock fallback"
```

---

### Task 5: Bookings List Screen

**Files:**
- Replace: `app/(tabs)/bookings.tsx`

- [ ] **Step 1: Replace the bookings stub with the full SectionList screen**

```tsx
// app/(tabs)/bookings.tsx
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
```

- [ ] **Step 2: Verify the screen renders**

Run: `cd /Users/ilynn/Projects/engineering/vava-backend/myApp && npx expo start`
Navigate to the Bookings tab. Expected: page title "我的預約", two sections with mock booking cards, pull-to-refresh works.

- [ ] **Step 3: Commit**

```bash
cd /Users/ilynn/Projects/engineering/vava-backend
git add myApp/app/\(tabs\)/bookings.tsx
git commit -m "feat(bookings): replace bookings stub with SectionList screen"
```

---

### Task 6: Tabs Layout + Booking Detail Route

**Files:**
- Modify: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/booking/_layout.tsx`
- Create: `app/(tabs)/booking/[id].tsx`

- [ ] **Step 1: Update tabs layout to register the booking stack and hide it from the tab bar**

Replace the full content of `app/(tabs)/_layout.tsx`:

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router'
import React from 'react'

import { FloatingTabBar } from '@/components/floating-tab-bar'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="bookings" options={{ title: 'Bookings' }} />
      <Tabs.Screen name="account" options={{ title: 'Account' }} />
      <Tabs.Screen
        name="booking"
        options={{
          href: null, // hide from tab bar
        }}
      />
    </Tabs>
  )
}
```

- [ ] **Step 2: Create booking detail layout**

```tsx
// app/(tabs)/booking/_layout.tsx
import { Stack } from 'expo-router'

export default function BookingDetailLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
```

- [ ] **Step 3: Create booking detail screen**

```tsx
// app/(tabs)/booking/[id].tsx
import { useState, useCallback, useMemo } from 'react'
import { Pressable, ActivityIndicator, Alert } from 'react-native'
import { YStack, XStack, Text, ScrollView, View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { FontAwesome6 } from '@expo/vector-icons'

import { StatusBadge } from '@/components/booking/StatusBadge'
import { fetchBookingDetail } from '@/lib/bookings-api'
import { formatBookingDate, formatSlotTime } from '@/lib/booking-helpers'
import type { BookingDetail } from '@/types/booking-list'

export default function BookingDetailScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  const [detail, setDetail] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      if (!id) return
      setLoading(true)
      fetchBookingDetail(id)
        .then((data) => { setDetail(data); setError(null) })
        .catch((e) => setError(e instanceof Error ? e.message : '載入失敗'))
        .finally(() => setLoading(false))
    }, [id])
  )

  const now = useMemo(() => new Date(), [])

  if (loading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <ActivityIndicator size="large" color="#1F2723" />
      </YStack>
    )
  }

  if (error || !detail) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background" gap={16}>
        <Text fontSize={15} color="#808868">{error ?? '找不到預約'}</Text>
        <Pressable onPress={() => router.back()}>
          <Text fontSize={14} fontWeight="600" color="#1F2723">返回</Text>
        </Pressable>
      </YStack>
    )
  }

  const startsAt = new Date(detail.starts_at)
  const sessionEndsAt = new Date(detail.session_ends_at)
  const createdAt = new Date(detail.created_at)
  const domainLabel = detail.service_domain === 'nails' ? '美甲' : '美睫'

  // Timing calculations
  const msUntilStart = startsAt.getTime() - now.getTime()
  const minUntilStart = msUntilStart / 60_000
  const msSinceCreation = now.getTime() - createdAt.getTime()
  const minSinceCreation = msSinceCreation / 60_000

  const isUpcoming = detail.status === 'confirmed' && msUntilStart > 0
  const isDayOf = isUpcoming && minUntilStart <= 24 * 60
  const showPhone = isDayOf && minUntilStart <= 10
  const showLateButton = isDayOf && minUntilStart <= 10 && !detail.customer_late_notified_at
  const showNoShowButton = detail.status === 'confirmed' && msUntilStart < 0 &&
    Math.abs(minUntilStart) >= detail.no_show_window_minutes
  const isInGrace = minSinceCreation <= 10
  const isTerminal = ['cancelled_grace', 'cancelled_customer', 'cancelled_pro',
    'no_show_customer', 'no_show_pro', 'rescheduled', 'expired'].includes(detail.status)

  function handleCancel() {
    let flagWarning = ''
    if (isInGrace) {
      flagWarning = '10分鐘內免責取消，不會影響你的紀錄。'
    } else if (minUntilStart > 120) {
      flagWarning = '取消後將記錄一次輕微違規。'
    } else if (minUntilStart > 30) {
      flagWarning = '取消後將記錄一次輕微違規。'
    } else {
      flagWarning = '距離預約不到30分鐘，取消將記錄一次嚴重違規。'
    }
    Alert.alert('確定取消預約？', flagWarning, [
      { text: '先不要', style: 'cancel' },
      { text: '確定取消', style: 'destructive', onPress: () => {
        // TODO: call cancel API
        Alert.alert('已取消', '預約已取消')
        router.back()
      }},
    ])
  }

  function handleLateNotify() {
    // TODO: call late-notify API
    Alert.alert('已通知', '已通知設計師你會晚到')
  }

  function handleNoShow() {
    Alert.alert('確認設計師未到場？', '我們會記錄此事件並通知設計師。', [
      { text: '先不要', style: 'cancel' },
      { text: '確認', style: 'destructive', onPress: () => {
        // TODO: call no-show API
        Alert.alert('已回報', '已記錄設計師未到場')
        router.back()
      }},
    ])
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Header */}
      <XStack
        paddingTop={insets.top}
        height={insets.top + 48}
        alignItems="center"
        paddingHorizontal={12}
      >
        <Pressable
          onPress={() => router.back()}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          accessibilityLabel="返回"
        >
          <FontAwesome6 name="chevron-left" size={20} color="#1F2723" />
        </Pressable>
        <View flex={1} alignItems="center">
          <Text fontSize={16} fontWeight="600" color="#1F2723">預約詳情</Text>
        </View>
        <View width={44} />
      </XStack>

      <ScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
      >
        {/* Booking info card */}
        <YStack backgroundColor="#F0EDE5" borderRadius={12} padding={20} gap={16} marginTop={16}>
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize={20} fontWeight="700" color="#1F2723">
              {detail.pro_display_name}
            </Text>
            <StatusBadge status={detail.status} />
          </XStack>

          <YStack gap={8}>
            <XStack gap={8} alignItems="center">
              <FontAwesome6 name="scissors" size={14} color="#808868" />
              <Text fontSize={15} color="#808868">
                {domainLabel} — {detail.service_label}
              </Text>
            </XStack>

            <XStack gap={8} alignItems="center">
              <FontAwesome6 name="calendar" size={14} color="#808868" />
              <Text fontSize={15} color="#808868">
                {formatBookingDate(detail.starts_at)} {formatSlotTime(detail.starts_at)}
              </Text>
            </XStack>

            <XStack gap={8} alignItems="center">
              <FontAwesome6 name="location-dot" size={14} color="#808868" />
              <Text fontSize={15} color="#808868">
                {detail.studio_address}
              </Text>
            </XStack>

            <XStack gap={8} alignItems="center">
              <FontAwesome6 name="dollar-sign" size={14} color="#808868" />
              <Text fontSize={15} color="#808868">
                NT${detail.price_min}–{detail.price_max}
              </Text>
            </XStack>

            {showPhone && detail.pro_phone && (
              <XStack gap={8} alignItems="center">
                <FontAwesome6 name="phone" size={14} color="#2E7D52" />
                <Text fontSize={15} fontWeight="600" color="#2E7D52">
                  {detail.pro_phone}
                </Text>
              </XStack>
            )}
          </YStack>
        </YStack>

        {/* Action buttons */}
        {isUpcoming && !isTerminal && (
          <YStack gap={12} marginTop={24}>
            {/* Cancel */}
            <Pressable
              onPress={handleCancel}
              style={{
                borderRadius: 9999,
                height: 48,
                backgroundColor: '#1F2723',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text fontSize={16} fontWeight="600" color="#FBFBF8">
                {isInGrace ? '免責取消' : '取消預約'}
              </Text>
            </Pressable>

            {/* Late notify */}
            {showLateButton && (
              <Pressable
                onPress={handleLateNotify}
                style={{
                  borderRadius: 9999,
                  height: 48,
                  borderWidth: 1,
                  borderColor: '#1F2723',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text fontSize={16} fontWeight="600" color="#1F2723">我會晚到</Text>
              </Pressable>
            )}

            {/* Reschedule (disabled — future scope) */}
            <Pressable
              disabled
              style={{
                borderRadius: 9999,
                height: 48,
                borderWidth: 1,
                borderColor: '#EAEAE4',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.4,
              }}
            >
              <Text fontSize={16} fontWeight="600" color="#808868">改期（即將推出）</Text>
            </Pressable>
          </YStack>
        )}

        {/* No-show button */}
        {showNoShowButton && (
          <YStack marginTop={24}>
            <Pressable
              onPress={handleNoShow}
              style={{
                borderRadius: 9999,
                height: 48,
                backgroundColor: '#C62828',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text fontSize={16} fontWeight="600" color="#FBFBF8">設計師未到場</Text>
            </Pressable>
          </YStack>
        )}

        {/* Completed — rating (disabled — future scope) */}
        {detail.status === 'completed' && (
          <YStack marginTop={24}>
            <Pressable
              disabled
              style={{
                borderRadius: 9999,
                height: 48,
                borderWidth: 1,
                borderColor: '#EAEAE4',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.4,
              }}
            >
              <Text fontSize={16} fontWeight="600" color="#808868">評分（即將推出）</Text>
            </Pressable>
          </YStack>
        )}

        {/* Payment note */}
        {isUpcoming && (
          <Text fontSize={13} color="#808868" textAlign="center" marginTop={24}>
            實際費用將於服務結束後由設計師確認
          </Text>
        )}
      </ScrollView>
    </YStack>
  )
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/ilynn/Projects/engineering/vava-backend
git add myApp/app/\(tabs\)/_layout.tsx myApp/app/\(tabs\)/booking/_layout.tsx myApp/app/\(tabs\)/booking/\[id\].tsx
git commit -m "feat(bookings): add booking detail screen and update tabs layout"
```

---

### Task 7: Verify End-to-End

- [ ] **Step 1: Start the dev server**

Run: `cd /Users/ilynn/Projects/engineering/vava-backend/myApp && npx expo start`

- [ ] **Step 2: Verify bookings list**

Navigate to Bookings tab. Check:
- Page title "我的預約" visible
- "即將到來" section shows mock booking (Mia, confirmed, tomorrow)
- "歷史紀錄" section shows 2 mock bookings (Yuki completed, Hana cancelled)
- Pull-to-refresh works (spinner appears, list reloads)
- Status badges show correct colors (green for confirmed, grey for completed, red for cancelled)

- [ ] **Step 3: Verify booking card tap → detail**

Tap the "Mia" booking card. Check:
- Navigates to detail screen
- Shows: pro name, service, date/time, address, price range
- "已確認" status badge in green
- Cancel button visible
- Reschedule button visible but disabled
- Back button returns to bookings list
- Tab bar remains visible

- [ ] **Step 4: Verify empty state**

Temporarily change `MOCK_BOOKINGS` to `[]` in `lib/bookings-api.ts`. Reload. Check:
- Calendar icon + "還沒有預約紀錄" + "開始預約" button visible
- Tapping "開始預約" opens booking flow modal
- Revert `MOCK_BOOKINGS` back to original

- [ ] **Step 5: Final commit**

```bash
cd /Users/ilynn/Projects/engineering/vava-backend
git add -A myApp/
git commit -m "feat(bookings): bookings tab complete — list + detail + empty/loading/error states"
```
