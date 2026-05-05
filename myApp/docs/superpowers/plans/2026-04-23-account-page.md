# Account Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full Account/Profile screen with a floating dual-role toggle (Customer ↔ Pro), a Liked Pros feature (save designers from results/booking detail, re-book from account), and role-based state management driving the tab bar.

**Architecture:** Three structurally independent layers in the account screen — a fixed header, an absolutely-positioned floating toggle that straddles the header/content boundary, and a ScrollView with top padding to clear the toggle. Role state lives in `RoleContext` (AsyncStorage-persisted), and liked pros use a mock API matching the existing `bookings-api` pattern.

**Tech Stack:** React Native, Expo Router, Tamagui, AsyncStorage (`@react-native-async-storage/async-storage`), Supabase, FontAwesome6 / FA6ProIcon

---

## File Map

### New files
| File | Responsibility |
|------|---------------|
| `types/liked-pros.ts` | `LikedPro` type |
| `supabase/migrations/0002_liked_pros.sql` | `liked_pros` table + RLS |
| `lib/liked-pros-api.ts` | `fetchLikedPros`, `likePro`, `unlikePro`, `isProLiked` |
| `lib/role-context.tsx` | `RoleProvider`, `useRole`, AsyncStorage persistence, Supabase pro check |
| `app/account/_layout.tsx` | Stack layout for account sub-screens |
| `components/account/SettingsRow.tsx` | Reusable tappable settings row |
| `components/account/ProfileHeader.tsx` | Header layer with avatar, name, role label, notification icon |
| `components/account/RoleToggle.tsx` | Floating toggle card (absolute position, `TOGGLE_HEIGHT = 60`) |
| `components/account/LikedProCard.tsx` | Row in liked pros list |
| `components/account/LikedProSheet.tsx` | Modal sheet on liked pro tap → routes to booking flow |
| `components/HeartButton.tsx` | Heart toggle used in results + booking detail |
| `app/account/liked-pros.tsx` | Liked pros list screen |

### Modified files
| File | Change |
|------|--------|
| `app/_layout.tsx` | Wrap tree with `RoleProvider` |
| `app/(tabs)/_layout.tsx` | Subscribe to `activeRole` (pro tab set is future spec) |
| `app/(tabs)/account.tsx` | Full rewrite — 3-layer structure |
| `app/book/results.tsx` | Add `HeartButton` to pro cards in bottom sheet |
| `components/booking/BookingDetailSheet.tsx` | Add `HeartButton` in header row |

---

## Task 1: Types + Supabase migration

**Files:**
- Create: `types/liked-pros.ts`
- Create: `supabase/migrations/0002_liked_pros.sql`

- [ ] **Step 1: Create `LikedPro` type**

```ts
// types/liked-pros.ts
export type LikedPro = {
  pro_id: string
  pro_display_name: string
  service_domain: 'nails' | 'lashes'
  profile_photo_url: string | null
}
```

- [ ] **Step 2: Create Supabase migration**

```sql
-- supabase/migrations/0002_liked_pros.sql
create table liked_pros (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  pro_id      uuid not null references pros(id) on delete cascade,
  created_at  timestamptz default now(),
  unique(customer_id, pro_id)
);

alter table liked_pros enable row level security;

create policy "customers can manage own likes"
  on liked_pros for all
  using  (auth.uid() = customer_id)
  with check (auth.uid() = customer_id);
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd myApp && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add types/liked-pros.ts supabase/migrations/0002_liked_pros.sql
git commit -m "feat: add LikedPro type and liked_pros migration"
```

---

## Task 2: Liked pros API

**Files:**
- Create: `lib/liked-pros-api.ts`

- [ ] **Step 1: Create mock API**

```ts
// lib/liked-pros-api.ts
import { supabase } from './supabase'
import type { LikedPro } from '@/types/liked-pros'

const USE_MOCK = true

const MOCK_LIKED_PROS: LikedPro[] = [
  { pro_id: 'mock-pro-1', pro_display_name: 'Joy',  service_domain: 'nails',  profile_photo_url: null },
  { pro_id: 'mock-pro-2', pro_display_name: 'Momo', service_domain: 'lashes', profile_photo_url: null },
]

// Mutable set so likePro / unlikePro work in mock mode
const mockLikedIds = new Set<string>(MOCK_LIKED_PROS.map((p) => p.pro_id))

export async function fetchLikedPros(): Promise<LikedPro[]> {
  if (USE_MOCK) return MOCK_LIKED_PROS.filter((p) => mockLikedIds.has(p.pro_id))
  throw new Error('fetchLikedPros: real backend not yet implemented')
}

export async function likePro(proId: string): Promise<void> {
  if (USE_MOCK) { mockLikedIds.add(proId); return }
  const { error } = await supabase.from('liked_pros').insert({ pro_id: proId })
  if (error) throw new Error(error.message)
}

export async function unlikePro(proId: string): Promise<void> {
  if (USE_MOCK) { mockLikedIds.delete(proId); return }
  const { error } = await supabase.from('liked_pros').delete().eq('pro_id', proId)
  if (error) throw new Error(error.message)
}

export function isProLiked(proId: string, likedPros: LikedPro[]): boolean {
  return likedPros.some((p) => p.pro_id === proId)
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/liked-pros-api.ts
git commit -m "feat: add liked-pros API with mock mode"
```

---

## Task 3: Role context

**Files:**
- Create: `lib/role-context.tsx`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Create `RoleContext`**

```tsx
// lib/role-context.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './supabase'

export type UserRole = 'customer' | 'pro'

type RoleState = {
  enabledRoles: UserRole[]
  activeRole: UserRole
  setActiveRole: (role: UserRole) => Promise<void>
  isRoleLoading: boolean
}

const STORAGE_KEY = '@vava/activeRole'

const RoleContext = createContext<RoleState>({
  enabledRoles: ['customer'],
  activeRole: 'customer',
  setActiveRole: async () => {},
  isRoleLoading: true,
})

export function RoleProvider({ children }: { children: ReactNode }) {
  const [enabledRoles, setEnabledRoles] = useState<UserRole[]>(['customer'])
  const [activeRole, setActiveRoleState] = useState<UserRole>('customer')
  const [isRoleLoading, setIsRoleLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const stored = await AsyncStorage.getItem(STORAGE_KEY)
      const persisted: UserRole = stored === 'pro' ? 'pro' : 'customer'

      const { data: { session } } = await supabase.auth.getSession()
      let roles: UserRole[] = ['customer']

      if (session?.user) {
        const { data } = await supabase
          .from('pros')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('is_approved', true)
          .maybeSingle()
        if (data) roles = ['customer', 'pro']
      }

      setEnabledRoles(roles)
      setActiveRoleState(roles.includes(persisted) ? persisted : 'customer')
      setIsRoleLoading(false)
    }
    init()
  }, [])

  async function setActiveRole(role: UserRole) {
    setActiveRoleState(role)
    await AsyncStorage.setItem(STORAGE_KEY, role)
  }

  return (
    <RoleContext.Provider value={{ enabledRoles, activeRole, setActiveRole, isRoleLoading }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole(): RoleState {
  return useContext(RoleContext)
}
```

- [ ] **Step 2: Wrap root layout with `RoleProvider`**

In `app/_layout.tsx`, import `RoleProvider` and wrap inside `SessionProvider`:

```tsx
// app/_layout.tsx — add import
import { RoleProvider } from '@/lib/role-context'

// Inside the JSX, wrap BookingProvider:
<SessionProvider>
  <RoleProvider>
    <BookingProvider>
      {/* ... existing Stack ... */}
    </BookingProvider>
  </RoleProvider>
</SessionProvider>
```

The full updated file:

```tsx
import { View } from 'react-native'
import { TamaguiProvider } from 'tamagui'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFonts } from 'expo-font'
import 'react-native-reanimated'

import tamaguiConfig from '../tamagui.config'
import { SessionProvider } from '@/lib/auth-context'
import { RoleProvider } from '@/lib/role-context'
import { BookingProvider } from '@/lib/booking-context'

const BG = '#FBFBF8'

export const unstable_settings = {
  initialRouteName: '(tabs)',
}

export default function RootLayout() {
  const insets = useSafeAreaInsets()
  useFonts({
    'FA6Pro-Solid':   require('../assets/fonts/FA6Pro-Solid.otf'),
    'FA6Pro-Regular': require('../assets/fonts/FA6Pro-Regular.otf'),
  })

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top - 2, backgroundColor: BG, zIndex: 10 }} />
      <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
        <SessionProvider>
          <RoleProvider>
            <BookingProvider>
              <Stack screenOptions={{ contentStyle: { backgroundColor: BG } }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="book" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
                <Stack.Screen name="booking" options={{ headerShown: false }} />
                <Stack.Screen name="account" options={{ headerShown: false }} />
              </Stack>
              <StatusBar style="dark" />
            </BookingProvider>
          </RoleProvider>
        </SessionProvider>
      </TamaguiProvider>
    </View>
  )
}
```

Note: `account` Stack.Screen is added so `/account/liked-pros` resolves correctly.

- [ ] **Step 3: Verify TypeScript + lint**

```bash
npx tsc --noEmit && npm run lint
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/role-context.tsx app/_layout.tsx
git commit -m "feat: add RoleContext with AsyncStorage persistence and Supabase pro check"
```

---

## Task 4: Tab layout role subscription + account sub-stack

**Files:**
- Modify: `app/(tabs)/_layout.tsx`
- Create: `app/account/_layout.tsx`

- [ ] **Step 1: Subscribe tab layout to role (no behaviour change yet)**

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router'
import { FloatingTabBar } from '@/components/floating-tab-bar'
import { useRole } from '@/lib/role-context'

export default function TabLayout() {
  const { activeRole } = useRole() // subscribes — pro tab set defined in future spec

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen name="index"    options={{ title: 'Home' }} />
      <Tabs.Screen name="bookings" options={{ title: 'Bookings' }} />
      <Tabs.Screen name="account"  options={{ title: 'Account' }} />
    </Tabs>
  )
}
```

- [ ] **Step 2: Create account sub-stack layout**

```tsx
// app/account/_layout.tsx
import { Stack } from 'expo-router'

export default function AccountLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/'(tabs)'/_layout.tsx app/account/_layout.tsx
git commit -m "feat: subscribe tab layout to role context; add account sub-stack"
```

---

## Task 5: SettingsRow component

**Files:**
- Create: `components/account/SettingsRow.tsx`

- [ ] **Step 1: Create component**

```tsx
// components/account/SettingsRow.tsx
import { Pressable } from 'react-native'
import { XStack, Text } from 'tamagui'
import { FontAwesome6 } from '@expo/vector-icons'

type Props = {
  label: string
  onPress?: () => void
  disabled?: boolean
  labelColor?: string
  showChevron?: boolean
}

export function SettingsRow({
  label,
  onPress,
  disabled = false,
  labelColor = '#1F2723',
  showChevron = true,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({ opacity: disabled ? 0.38 : pressed ? 0.6 : 1 })}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <XStack height={48} paddingHorizontal={16} alignItems="center" justifyContent="space-between">
        <Text fontSize={15} lineHeight={22} color={labelColor}>
          {label}
        </Text>
        {showChevron && !disabled && (
          <FontAwesome6 name="chevron-right" size={12} color="#808868" />
        )}
      </XStack>
    </Pressable>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/account/SettingsRow.tsx
git commit -m "feat: add SettingsRow component"
```

---

## Task 6: ProfileHeader component

**Files:**
- Create: `components/account/ProfileHeader.tsx`

- [ ] **Step 1: Create component**

```tsx
// components/account/ProfileHeader.tsx
import { Alert, Pressable } from 'react-native'
import { XStack, YStack, Text, View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FontAwesome6 } from '@expo/vector-icons'
import type { LayoutChangeEvent } from 'react-native'

type Props = {
  displayName: string
  roleLabel: string
  avatarInitial: string
  /** Pass TOGGLE_HEIGHT when toggle is shown, 0 when hidden */
  toggleHeight: number
  onLayout: (event: LayoutChangeEvent) => void
}

export function ProfileHeader({
  displayName,
  roleLabel,
  avatarInitial,
  toggleHeight,
  onLayout,
}: Props) {
  const insets = useSafeAreaInsets()

  return (
    <YStack
      backgroundColor="#F0EDE5"
      paddingTop={insets.top + 12}
      paddingHorizontal={16}
      paddingBottom={toggleHeight / 2}
      onLayout={onLayout}
    >
      <XStack alignItems="center" justifyContent="space-between">
        <XStack alignItems="center" gap={12}>
          {/* Avatar — initials placeholder */}
          <View
            width={48}
            height={48}
            borderRadius={24}
            backgroundColor="#d4b8a0"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize={18} fontWeight="700" color="#FBFBF8">
              {avatarInitial}
            </Text>
          </View>

          {/* Name + role */}
          <YStack gap={2}>
            <Text fontSize={16} fontWeight="700" color="#1F2723">
              {displayName}
            </Text>
            <Text fontSize={13} color="#808868">
              {roleLabel}
            </Text>
          </YStack>
        </XStack>

        {/* Notification icon */}
        <Pressable
          onPress={() => Alert.alert('通知', '通知功能即將推出')}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          accessibilityLabel="通知"
          accessibilityRole="button"
        >
          <FontAwesome6 name="bell" size={20} color="#1F2723" />
        </Pressable>
      </XStack>
    </YStack>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/account/ProfileHeader.tsx
git commit -m "feat: add ProfileHeader component"
```

---

## Task 7: RoleToggle component

**Files:**
- Create: `components/account/RoleToggle.tsx`

- [ ] **Step 1: Create component**

```tsx
// components/account/RoleToggle.tsx
import { View, Switch } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import type { UserRole } from '@/lib/role-context'

export const TOGGLE_HEIGHT = 60

type Props = {
  headerHeight: number
  activeRole: UserRole
  onToggle: (value: boolean) => void
}

export function RoleToggle({ headerHeight, activeRole, onToggle }: Props) {
  const isProActive = activeRole === 'pro'

  return (
    <View
      style={{
        position: 'absolute',
        top: headerHeight - TOGGLE_HEIGHT / 2,
        left: 16,
        right: 16,
        height: TOGGLE_HEIGHT,
        zIndex: 10,
        backgroundColor: '#FBFBF8',
        borderRadius: 10,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#0C0C0D',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#EAEAE4',
      }}
    >
      <YStack gap={2}>
        <Text fontSize={12} color="#808868">Using Vava as</Text>
        <Text fontSize={14} fontWeight="700" color="#1F2723">
          {isProActive ? '設計師' : '顧客'}
        </Text>
      </YStack>

      <Switch
        value={isProActive}
        onValueChange={onToggle}
        trackColor={{ false: '#b0aea5', true: '#c96442' }}
        thumbColor="#ffffff"
        accessibilityLabel="切換模式"
        accessibilityRole="switch"
      />
    </View>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/account/RoleToggle.tsx
git commit -m "feat: add RoleToggle floating component (TOGGLE_HEIGHT=60)"
```

---

## Task 8: Account page — main screen rewrite

**Files:**
- Modify: `app/(tabs)/account.tsx`

- [ ] **Step 1: Rewrite account screen with 3-layer structure**

```tsx
// app/(tabs)/account.tsx
import { useState } from 'react'
import { Alert, ScrollView, View } from 'react-native'
import { YStack, Text } from 'tamagui'
import { useRouter } from 'expo-router'
import type { LayoutChangeEvent } from 'react-native'

import { useSession } from '@/lib/auth-context'
import { useRole } from '@/lib/role-context'
import { ProfileHeader } from '@/components/account/ProfileHeader'
import { RoleToggle, TOGGLE_HEIGHT } from '@/components/account/RoleToggle'
import { SettingsRow } from '@/components/account/SettingsRow'

const SECTION_GAP = 24

export default function AccountScreen() {
  const router = useRouter()
  const { session, signOut } = useSession()
  const { enabledRoles, activeRole, setActiveRole } = useRole()
  const [headerHeight, setHeaderHeight] = useState(0)

  const showToggle = enabledRoles.length >= 2

  const user = session?.user
  const displayName =
    user?.user_metadata?.full_name ?? user?.email ?? user?.phone ?? '使用者'
  const avatarInitial = (displayName[0] ?? 'V').toUpperCase()
  const roleLabel = activeRole === 'pro' ? '設計師' : '顧客'

  function handleLayout(event: LayoutChangeEvent) {
    setHeaderHeight(event.nativeEvent.layout.height)
  }

  async function handleRoleToggle(value: boolean) {
    await setActiveRole(value ? 'pro' : 'customer')
  }

  function handleLogout() {
    Alert.alert('確定登出？', '', [
      { text: '取消', style: 'cancel' },
      { text: '登出', style: 'destructive', onPress: signOut },
    ])
  }

  const scrollTopPadding = showToggle ? TOGGLE_HEIGHT / 2 + 8 : 16

  return (
    <YStack flex={1} backgroundColor="$background" position="relative">

      {/* Layer 1: Header */}
      <ProfileHeader
        displayName={displayName}
        roleLabel={roleLabel}
        avatarInitial={avatarInitial}
        toggleHeight={showToggle ? TOGGLE_HEIGHT : 0}
        onLayout={handleLayout}
      />

      {/* Layer 2: Floating role toggle — dual-role users only */}
      {showToggle && headerHeight > 0 && (
        <RoleToggle
          headerHeight={headerHeight}
          activeRole={activeRole}
          onToggle={handleRoleToggle}
        />
      )}

      {/* Layer 3: Scrollable content */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: scrollTopPadding, paddingBottom: 40 }}
      >
        {/* ── Section: 我的 Vava ── */}
        <YStack marginBottom={SECTION_GAP}>
          <Text
            fontSize={12}
            fontWeight="700"
            color="#808868"
            paddingHorizontal={16}
            paddingTop={12}
            paddingBottom={4}
            style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}
          >
            我的 Vava
          </Text>
          <YStack
            backgroundColor="#FBFBF8"
            borderTopWidth={1}
            borderBottomWidth={1}
            borderColor="#F0EDE5"
          >
            <SettingsRow
              label="預約紀錄"
              onPress={() => router.navigate('/(tabs)/bookings')}
            />
            <View style={{ height: 1, backgroundColor: '#F0EDE5', marginLeft: 16 }} />
            <SettingsRow
              label="喜愛的設計師"
              onPress={() => router.push('/account/liked-pros')}
            />
          </YStack>
        </YStack>

        {/* ── Section: 設定 ── */}
        <YStack marginBottom={SECTION_GAP}>
          <Text
            fontSize={12}
            fontWeight="700"
            color="#808868"
            paddingHorizontal={16}
            paddingBottom={4}
            style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}
          >
            設定
          </Text>
          <YStack
            backgroundColor="#FBFBF8"
            borderTopWidth={1}
            borderBottomWidth={1}
            borderColor="#F0EDE5"
          >
            {user?.email && (
              <>
                <YStack paddingHorizontal={16} paddingVertical={10}>
                  <Text fontSize={12} color="#808868" marginBottom={2}>電子郵件</Text>
                  <Text fontSize={15} color="#1F2723">{user.email}</Text>
                </YStack>
                <View style={{ height: 1, backgroundColor: '#F0EDE5', marginLeft: 16 }} />
              </>
            )}
            {user?.phone && (
              <>
                <YStack paddingHorizontal={16} paddingVertical={10}>
                  <Text fontSize={12} color="#808868" marginBottom={2}>手機號碼</Text>
                  <Text fontSize={15} color="#1F2723">{user.phone}</Text>
                </YStack>
                <View style={{ height: 1, backgroundColor: '#F0EDE5', marginLeft: 16 }} />
              </>
            )}
            <SettingsRow label="編輯個人資料" disabled showChevron={false} />
          </YStack>
        </YStack>

        {/* ── Section: 支援 ── */}
        <YStack marginBottom={SECTION_GAP}>
          <Text
            fontSize={12}
            fontWeight="700"
            color="#808868"
            paddingHorizontal={16}
            paddingBottom={4}
            style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}
          >
            支援
          </Text>
          <YStack
            backgroundColor="#FBFBF8"
            borderTopWidth={1}
            borderBottomWidth={1}
            borderColor="#F0EDE5"
          >
            <SettingsRow
              label="幫助中心"
              onPress={() => Alert.alert('幫助中心', '即將推出')}
            />
            <View style={{ height: 1, backgroundColor: '#F0EDE5', marginLeft: 16 }} />
            <SettingsRow
              label="聯絡我們"
              onPress={() => Alert.alert('聯絡我們', '即將推出')}
            />
            {!enabledRoles.includes('pro') && (
              <>
                <View style={{ height: 1, backgroundColor: '#F0EDE5', marginLeft: 16 }} />
                <SettingsRow
                  label="成為設計師"
                  labelColor="#c96442"
                  onPress={() => Alert.alert('成為設計師', '即將推出')}
                />
              </>
            )}
          </YStack>
        </YStack>

        {/* ── Logout ── */}
        <YStack>
          <YStack
            backgroundColor="#FBFBF8"
            borderTopWidth={1}
            borderBottomWidth={1}
            borderColor="#F0EDE5"
          >
            <SettingsRow
              label="登出"
              labelColor="#b53333"
              showChevron={false}
              onPress={handleLogout}
            />
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  )
}
```

- [ ] **Step 2: Verify TypeScript + lint**

```bash
npx tsc --noEmit && npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/'(tabs)'/account.tsx
git commit -m "feat: rewrite account screen with 3-layer profile + floating role toggle"
```

---

## Task 9: LikedProCard + HeartButton

**Files:**
- Create: `components/account/LikedProCard.tsx`
- Create: `components/HeartButton.tsx`

- [ ] **Step 1: Create `LikedProCard`**

```tsx
// components/account/LikedProCard.tsx
import { Pressable } from 'react-native'
import { XStack, YStack, Text, View } from 'tamagui'
import type { LikedPro } from '@/types/liked-pros'

type Props = {
  pro: LikedPro
  onBook: () => void
}

export function LikedProCard({ pro, onBook }: Props) {
  const domainLabel = pro.service_domain === 'nails' ? '美甲師' : '美睫師'
  const initial = (pro.pro_display_name[0] ?? 'P').toUpperCase()

  return (
    <XStack paddingHorizontal={16} paddingVertical={12} alignItems="center" gap={12}>
      <View
        width={44}
        height={44}
        borderRadius={22}
        backgroundColor="#e8e6dc"
        alignItems="center"
        justifyContent="center"
      >
        <Text fontSize={16} fontWeight="700" color="#4d4c48">{initial}</Text>
      </View>

      <YStack flex={1} gap={2}>
        <Text fontSize={15} fontWeight="700" color="#1F2723">{pro.pro_display_name}</Text>
        <Text fontSize={13} color="#808868">{domainLabel}</Text>
      </YStack>

      <Pressable
        onPress={onBook}
        style={({ pressed }) => ({
          borderRadius: 9999,
          height: 34,
          paddingHorizontal: 16,
          backgroundColor: '#1F2723',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.7 : 1,
        })}
        accessibilityLabel={`預約 ${pro.pro_display_name}`}
        accessibilityRole="button"
      >
        <Text fontSize={13} fontWeight="600" color="#FBFBF8">預約</Text>
      </Pressable>
    </XStack>
  )
}
```

- [ ] **Step 2: Create `HeartButton`**

```tsx
// components/HeartButton.tsx
import { Pressable } from 'react-native'
import { FA6ProIcon } from '@/components/FA6ProIcon'

type Props = {
  isLiked: boolean
  onToggle: () => void
  size?: number
}

export function HeartButton({ isLiked, onToggle, size = 20 }: Props) {
  return (
    <Pressable
      onPress={onToggle}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
      accessibilityLabel={isLiked ? '取消收藏' : '收藏設計師'}
      accessibilityRole="button"
    >
      <FA6ProIcon
        name="heart"
        size={size}
        color={isLiked ? '#b53333' : '#EAEAE4'}
        weight={isLiked ? 'solid' : 'regular'}
      />
    </Pressable>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/account/LikedProCard.tsx components/HeartButton.tsx
git commit -m "feat: add LikedProCard and HeartButton components"
```

---

## Task 10: LikedProSheet

**Files:**
- Create: `components/account/LikedProSheet.tsx`

- [ ] **Step 1: Create sheet component**

```tsx
// components/account/LikedProSheet.tsx
import { Modal, Pressable } from 'react-native'
import { YStack, XStack, Text, View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { FontAwesome6 } from '@expo/vector-icons'

import { useBookingRequest } from '@/lib/booking-context'
import type { LikedPro } from '@/types/liked-pros'

type Props = {
  pro: LikedPro | null
  onClose: () => void
}

export function LikedProSheet({ pro, onClose }: Props) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { dispatch } = useBookingRequest()

  function handleBook() {
    if (!pro) return
    dispatch({ type: 'RESET' })
    dispatch({
      type: 'SET_CATEGORY',
      payload: pro.service_domain === 'nails' ? 'nails' : 'lashes',
    })
    onClose()
    router.push('/book/location')
  }

  return (
    <Modal
      visible={pro !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      {pro && (
        <YStack flex={1} backgroundColor="$background">
          {/* Handle */}
          <YStack alignItems="center" paddingTop={8} paddingBottom={4}>
            <View width={36} height={4} borderRadius={2} backgroundColor="#EAEAE4" />
          </YStack>

          {/* Nav bar */}
          <XStack height={48} alignItems="center" paddingHorizontal={12}>
            <View flex={1} />
            <Text fontSize={16} fontWeight="600" color="#1F2723">設計師資訊</Text>
            <View flex={1} alignItems="flex-end">
              <Pressable
                onPress={onClose}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                accessibilityLabel="關閉"
              >
                <FontAwesome6 name="xmark" size={20} color="#1F2723" />
              </Pressable>
            </View>
          </XStack>

          {/* Pro info */}
          <YStack flex={1} alignItems="center" justifyContent="center" gap={16} paddingHorizontal={24}>
            <View
              width={80}
              height={80}
              borderRadius={40}
              backgroundColor="#e8e6dc"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize={28} fontWeight="700" color="#4d4c48">
                {(pro.pro_display_name[0] ?? 'P').toUpperCase()}
              </Text>
            </View>
            <YStack alignItems="center" gap={4}>
              <Text fontSize={20} fontWeight="700" color="#1F2723">{pro.pro_display_name}</Text>
              <Text fontSize={15} color="#808868">
                {pro.service_domain === 'nails' ? '美甲師' : '美睫師'}
              </Text>
            </YStack>
          </YStack>

          {/* CTA */}
          <YStack paddingHorizontal={16} paddingBottom={insets.bottom + 24}>
            <Pressable
              onPress={handleBook}
              style={{
                borderRadius: 9999,
                height: 48,
                backgroundColor: '#1F2723',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text fontSize={16} fontWeight="600" color="#FBFBF8">開始預約</Text>
            </Pressable>
          </YStack>
        </YStack>
      )}
    </Modal>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/account/LikedProSheet.tsx
git commit -m "feat: add LikedProSheet — pro info modal with booking shortcut"
```

---

## Task 11: Liked Pros screen

**Files:**
- Create: `app/account/liked-pros.tsx`

- [ ] **Step 1: Create screen**

```tsx
// app/account/liked-pros.tsx
import { useState, useCallback } from 'react'
import { ActivityIndicator, Pressable } from 'react-native'
import { YStack, Text, View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { FontAwesome6 } from '@expo/vector-icons'

import { fetchLikedPros } from '@/lib/liked-pros-api'
import { LikedProCard } from '@/components/account/LikedProCard'
import { LikedProSheet } from '@/components/account/LikedProSheet'
import type { LikedPro } from '@/types/liked-pros'

export default function LikedProsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const [pros, setPros] = useState<LikedPro[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPro, setSelectedPro] = useState<LikedPro | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchLikedPros()
      setPros(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      load()
    }, [load])
  )

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Nav bar */}
      <YStack paddingTop={insets.top} backgroundColor="$background">
        <XStack height={48} alignItems="center" paddingHorizontal={4}>
          <Pressable
            onPress={() => router.back()}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            accessibilityLabel="返回"
            accessibilityRole="button"
          >
            <FontAwesome6 name="chevron-left" size={18} color="#1F2723" />
          </Pressable>
          <Text flex={1} fontSize={16} fontWeight="600" color="#1F2723" textAlign="center">
            喜愛的設計師
          </Text>
          <View width={44} />
        </XStack>
      </YStack>

      {/* Loading */}
      {loading && (
        <YStack flex={1} justifyContent="center" alignItems="center">
          <ActivityIndicator size="large" color="#1F2723" />
        </YStack>
      )}

      {/* Error */}
      {!loading && error && (
        <YStack flex={1} justifyContent="center" alignItems="center" gap={16} paddingHorizontal={24}>
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
      )}

      {/* Empty state */}
      {!loading && !error && pros.length === 0 && (
        <YStack flex={1} justifyContent="center" alignItems="center" gap={12} paddingHorizontal={24}>
          <FontAwesome6 name="heart" size={40} color="#EAEAE4" />
          <Text fontSize={16} fontWeight="600" color="#808868">還沒有喜愛的設計師</Text>
          <Text fontSize={14} color="#808868" textAlign="center">
            在搜尋結果中點擊愛心，即可收藏設計師
          </Text>
        </YStack>
      )}

      {/* List */}
      {!loading && !error && pros.length > 0 && (
        <YStack flex={1} backgroundColor="#FBFBF8" borderTopWidth={1} borderColor="#F0EDE5">
          {pros.map((pro, index) => (
            <YStack key={pro.pro_id}>
              <LikedProCard pro={pro} onBook={() => setSelectedPro(pro)} />
              {index < pros.length - 1 && (
                <View height={1} backgroundColor="#F0EDE5" marginLeft={16} />
              )}
            </YStack>
          ))}
        </YStack>
      )}

      {/* Sheet */}
      <LikedProSheet pro={selectedPro} onClose={() => setSelectedPro(null)} />
    </YStack>
  )
}
```

Note: The `XStack` import is missing from the top-level `YStack`-only import — add it:

```tsx
import { YStack, XStack, Text, View } from 'tamagui'
```

- [ ] **Step 2: Verify TypeScript + lint**

```bash
npx tsc --noEmit && npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/account/liked-pros.tsx
git commit -m "feat: add liked pros screen with empty/loading/error states"
```

---

## Task 12: Heart button in results + booking detail

**Files:**
- Modify: `app/book/results.tsx`
- Modify: `components/booking/BookingDetailSheet.tsx`

### Part A — Results screen

- [ ] **Step 1: Add liked state to results**

In `app/book/results.tsx`, after the existing imports, add:

```tsx
import { HeartButton } from '@/components/HeartButton'
import { fetchLikedPros, likePro, unlikePro, isProLiked } from '@/lib/liked-pros-api'
import type { LikedPro } from '@/types/liked-pros'
```

Inside the component, add state for liked pros and fetch on mount:

```tsx
const [likedPros, setLikedPros] = useState<LikedPro[]>([])

useEffect(() => {
  fetchLikedPros().then(setLikedPros).catch(() => {})
}, [])

async function handleHeartToggle(proId: string, proDisplayName: string, serviceDomain: 'nails' | 'lashes') {
  const wasLiked = isProLiked(proId, likedPros)
  // Optimistic update
  if (wasLiked) {
    setLikedPros((prev) => prev.filter((p) => p.pro_id !== proId))
    await unlikePro(proId).catch(() => {
      // Revert on failure
      setLikedPros((prev) => [...prev, { pro_id: proId, pro_display_name: proDisplayName, service_domain: serviceDomain, profile_photo_url: null }])
    })
  } else {
    setLikedPros((prev) => [...prev, { pro_id: proId, pro_display_name: proDisplayName, service_domain: serviceDomain, profile_photo_url: null }])
    await likePro(proId).catch(() => {
      // Revert on failure
      setLikedPros((prev) => prev.filter((p) => p.pro_id !== proId))
    })
  }
}
```

In each pro card in the bottom sheet list, add `HeartButton` in the header row. First locate the pro name row:

```bash
grep -n "displayName\|pro\.pro\." app/book/results.tsx | head -20
```

Find the `XStack` or `Text` that renders `pro.pro.displayName`, then wrap it with a row that includes the heart:


```tsx
<HeartButton
  isLiked={isProLiked(pro.pro.id, likedPros)}
  onToggle={() => handleHeartToggle(
    pro.pro.id,
    pro.pro.displayName,
    state.category === 'nails' ? 'nails' : 'lashes'
  )}
  size={18}
/>
```

### Part B — BookingDetailSheet

- [ ] **Step 2: Add heart to BookingDetailSheet**

In `components/booking/BookingDetailSheet.tsx`, add imports:

```tsx
import { HeartButton } from '@/components/HeartButton'
import { fetchLikedPros, likePro, unlikePro, isProLiked } from '@/lib/liked-pros-api'
import type { LikedPro } from '@/types/liked-pros'
```

After existing state declarations, add:

```tsx
const [likedPros, setLikedPros] = useState<LikedPro[]>([])

useEffect(() => {
  fetchLikedPros().then(setLikedPros).catch(() => {})
}, [])

async function handleHeartToggle() {
  if (!detail) return
  // NOTE: BookingDetail has no pro_id field yet (schema gap). Use pro_display_name as a
  // stable mock key until the backend exposes pro_id. Replace with detail.pro_id when available.
  const proId = `display:${detail.pro_display_name}`
  const wasLiked = isProLiked(proId, likedPros)
  if (wasLiked) {
    setLikedPros((prev) => prev.filter((p) => p.pro_id !== proId))
    await unlikePro(proId).catch(() => {
      setLikedPros((prev) => [...prev, { pro_id: proId, pro_display_name: detail.pro_display_name, service_domain: detail.service_domain, profile_photo_url: null }])
    })
  } else {
    setLikedPros((prev) => [...prev, { pro_id: proId, pro_display_name: detail.pro_display_name, service_domain: detail.service_domain, profile_photo_url: null }])
    await likePro(proId).catch(() => {
      setLikedPros((prev) => prev.filter((p) => p.pro_id !== proId))
    })
  }
}
```

In the pro name row inside the booking info card (around line 134–139), add `HeartButton` next to the pro's display name:

```tsx
<XStack justifyContent="space-between" alignItems="center">
  <Text fontSize={20} fontWeight="700" lineHeight={28} color="#1F2723" flex={1}>
    {detail.pro_display_name}
  </Text>
  <HeartButton
    isLiked={isProLiked(detail.id, likedPros)}
    onToggle={handleHeartToggle}
    size={20}
  />
  <StatusBadge status={detail.status} />
</XStack>
```

- [ ] **Step 3: Verify TypeScript + lint**

```bash
npx tsc --noEmit && npm run lint
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/book/results.tsx components/booking/BookingDetailSheet.tsx
git commit -m "feat: add HeartButton to results pro cards and booking detail header"
```

---

## Verification Checklist

Run these before calling the feature complete:

```bash
# TypeScript
npx tsc --noEmit

# Lint
npm run lint

# Manual smoke test — account page
# 1. Open app → Account tab
# 2. Verify: header shows initials avatar, name, role label, bell icon
# 3. Verify: 3 sections render with correct rows
# 4. Verify: 登出 triggers confirmation alert
# 5. Verify: 喜愛的設計師 navigates to liked-pros screen
# 6. Verify: liked-pros screen shows 2 mock pros (Joy, Momo)
# 7. Verify: tapping 預約 on a liked pro opens LikedProSheet
# 8. Verify: tapping 開始預約 in sheet navigates to /book/location
# 9. (Dual-role only) Verify: floating toggle appears straddling header/content boundary
# 10. (Dual-role only) Verify: toggling switch changes role label in header
```
