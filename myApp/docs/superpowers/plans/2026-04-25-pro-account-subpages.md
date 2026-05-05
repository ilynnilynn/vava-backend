# Pro Account Sub-pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 4 real sub-pages off the Pro account screen (預約設定, 營業基本資料, 個人資料, 通知設定), wire them up, and remove the 休假設定 stub.

**Architecture:** Each sub-page lives in `app/pro/` following the exact pattern of the existing `app/pro/services.tsx` — safe-area-aware header with back + title + optional 儲存, ScrollView body, `#F5F5F0` cards, `#e8e6dc` dividers. All state is local `useState` — no Supabase. 通知設定 uses `Linking.openSettings()` (from `expo-linking`, already installed) to redirect to iOS settings; push state is a mock boolean.

**Tech Stack:** React Native, Expo Router, Tamagui (XStack/YStack/Text), `expo-linking` (already installed), FA6ProIcon

---

## Files

- **Modify:** `myApp/components/FA6ProIcon.tsx` — add `store` codepoint
- **Modify:** `myApp/app/(pro-tabs)/account.tsx` — wire routes, add 營業基本資料 row, remove 休假設定
- **Create:** `myApp/app/pro/booking-settings.tsx`
- **Create:** `myApp/app/pro/business-info.tsx`
- **Create:** `myApp/app/pro/profile.tsx`
- **Create:** `myApp/app/pro/notifications.tsx`

---

### Task 1: FA6ProIcon `store` + account.tsx wiring

**Files:**
- Modify: `myApp/components/FA6ProIcon.tsx`
- Modify: `myApp/app/(pro-tabs)/account.tsx`

- [ ] **Step 1: Add `store` codepoint to FA6ProIcon**

In `myApp/components/FA6ProIcon.tsx`, find the GLYPHS map and add (alphabetically near `sliders`):

```ts
'store': '\uF54E',
```

- [ ] **Step 2: Update account.tsx**

Replace the entire contents of `myApp/app/(pro-tabs)/account.tsx` with:

```tsx
// app/(pro-tabs)/account.tsx
import { Alert, ScrollView, StyleSheet, View } from 'react-native'
import { YStack, Text } from 'tamagui'
import { useRouter } from 'expo-router'

import { useSession } from '@/lib/auth-context'
import { ProfileHeader } from '@/components/account/ProfileHeader'
import { RoleToggle } from '@/components/account/RoleToggle'
import { SettingsRow } from '@/components/account/SettingsRow'

export default function ProAccountScreen() {
  const router = useRouter()
  const { session, signOut } = useSession()
  const user = session?.user
  const displayName =
    user?.user_metadata?.full_name ?? user?.email ?? user?.phone ?? '使用者'

  function handleLogout() {
    Alert.alert('確定登出？', '', [
      { text: '取消', style: 'cancel' },
      { text: '登出', style: 'destructive', onPress: signOut },
    ])
  }

  return (
    <YStack flex={1} backgroundColor="#FBFBF8">
      <ProfileHeader displayName={displayName} />
      <RoleToggle />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* ── 我的服務 ── */}
        <Text style={styles.sectionHeader}>我的服務</Text>
        <YStack>
          <SettingsRow
            label="服務項目管理"
            iconName="flower"
            onPress={() => router.push('/pro/services')}
          />
        </YStack>

        {/* ── 營業設定 ── */}
        <Text style={styles.sectionHeader}>營業設定</Text>
        <YStack>
          <SettingsRow
            label="營業基本資料"
            iconName="store"
            onPress={() => router.push('/pro/business-info')}
          />
          <View style={styles.divider} />
          <SettingsRow
            label="預約設定"
            iconName="calendar-check"
            onPress={() => router.push('/pro/booking-settings')}
          />
        </YStack>

        {/* ── 帳號 ── */}
        <Text style={styles.sectionHeader}>帳號</Text>
        <YStack>
          <SettingsRow
            label="個人資料"
            iconName="user"
            onPress={() => router.push('/pro/profile')}
          />
          <View style={styles.divider} />
          <SettingsRow
            label="通知設定"
            iconName="bell"
            onPress={() => router.push('/pro/notifications')}
          />
        </YStack>

        {/* ── 支援 ── */}
        <Text style={styles.sectionHeader}>支援</Text>
        <YStack>
          <SettingsRow
            label="幫助中心"
            iconName="circle-question"
            onPress={() => Alert.alert('幫助中心', '即將推出')}
          />
          <View style={styles.divider} />
          <SettingsRow
            label="聯絡我們"
            iconName="comment"
            onPress={() => Alert.alert('聯絡我們', '即將推出')}
          />
        </YStack>

        {/* ── 登出 ── */}
        <YStack marginTop={28}>
          <SettingsRow
            label="登出"
            iconName="arrow-right-from-bracket"
            showChevron={false}
            onPress={handleLogout}
          />
        </YStack>
      </ScrollView>
    </YStack>
  )
}

const styles = StyleSheet.create({
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#141413',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#e8e6dc',
    marginHorizontal: 16,
  },
})
```

- [ ] **Step 3: Lint**

```bash
cd /Users/ilynn/Projects/engineering/vava-backend/myApp && npm run lint 2>&1 | grep "error" | head -10
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/ilynn/Projects/engineering/vava-backend && git add myApp/components/FA6ProIcon.tsx myApp/app/\(pro-tabs\)/account.tsx && git commit -m "feat: wire pro account sub-page routes, add 營業基本資料 row"
```

---

### Task 2: 預約設定 screen

**Files:**
- Create: `myApp/app/pro/booking-settings.tsx`

- [ ] **Step 1: Create the screen**

Create `myApp/app/pro/booking-settings.tsx`:

```tsx
// app/pro/booking-settings.tsx
import { Alert, ScrollView, Switch, Pressable, StyleSheet, View } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { FA6ProIcon } from '@/components/FA6ProIcon'
import { useState } from 'react'

type BookingSettings = {
  minAdvanceHours: string
  maxAdvanceDays: string
  bufferMins: string
  autoConfirm: boolean
  cancelDeadline: string
}

const ADVANCE_HOURS_OPTIONS = ['1小時', '2小時', '4小時', '24小時']
const MAX_ADVANCE_OPTIONS = ['7天', '14天', '30天', '60天']
const BUFFER_OPTIONS = ['0分鐘', '15分鐘', '30分鐘', '60分鐘']
const CANCEL_DEADLINE_OPTIONS = ['1小時前', '4小時前', '24小時前', '48小時前']

function PickerRow({ label, value, options, onChange }: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  function showPicker() {
    Alert.alert(label, undefined, [
      ...options.map(o => ({ text: o, onPress: () => onChange(o) })),
      { text: '取消', style: 'cancel' as const },
    ])
  }
  return (
    <Pressable
      onPress={showPicker}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
    >
      <Text fontSize={15} color="#141413" flex={1}>{label}</Text>
      <Text fontSize={15} color="#858279" marginRight={6}>{value}</Text>
      <FA6ProIcon name="chevron-right" size={12} color="#c8c6be" />
    </Pressable>
  )
}

export default function BookingSettingsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [settings, setSettings] = useState<BookingSettings>({
    minAdvanceHours: '1小時',
    maxAdvanceDays: '30天',
    bufferMins: '15分鐘',
    autoConfirm: true,
    cancelDeadline: '24小時前',
  })

  function set<K extends keyof BookingSettings>(key: K, value: BookingSettings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <YStack flex={1} backgroundColor="#FBFBF8">
      <XStack
        paddingTop={insets.top + 16}
        paddingHorizontal={16}
        paddingBottom={12}
        alignItems="center"
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="返回"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, marginRight: 12 })}
        >
          <FA6ProIcon name="chevron-left" size={16} color="#141413" />
        </Pressable>
        <Text fontSize={18} fontWeight="700" color="#141413" flex={1}>預約設定</Text>
        <Pressable
          onPress={() => Alert.alert('已儲存')}
          accessibilityLabel="儲存"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Text fontSize={15} fontWeight="600" color="#c96442">儲存</Text>
        </Pressable>
      </XStack>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <Text style={styles.sectionLabel}>預約規則</Text>
        <View style={styles.card}>
          <PickerRow
            label="最早提前預約"
            value={settings.minAdvanceHours}
            options={ADVANCE_HOURS_OPTIONS}
            onChange={v => set('minAdvanceHours', v)}
          />
          <View style={styles.divider} />
          <PickerRow
            label="最多提前預約"
            value={settings.maxAdvanceDays}
            options={MAX_ADVANCE_OPTIONS}
            onChange={v => set('maxAdvanceDays', v)}
          />
          <View style={styles.divider} />
          <PickerRow
            label="服務間隔時間"
            value={settings.bufferMins}
            options={BUFFER_OPTIONS}
            onChange={v => set('bufferMins', v)}
          />
        </View>

        <Text style={styles.sectionLabel}>確認方式</Text>
        <View style={styles.card}>
          <XStack paddingHorizontal={14} paddingVertical={14} alignItems="center">
            <Text fontSize={15} color="#141413" flex={1}>自動確認預約</Text>
            <Switch
              value={settings.autoConfirm}
              onValueChange={v => set('autoConfirm', v)}
              trackColor={{ false: '#d8d6ce', true: '#c96442' }}
              thumbColor="#fff"
            />
          </XStack>
          <View style={styles.divider} />
          <PickerRow
            label="取消截止時間"
            value={settings.cancelDeadline}
            options={CANCEL_DEADLINE_OPTIONS}
            onChange={v => set('cancelDeadline', v)}
          />
        </View>
      </ScrollView>
    </YStack>
  )
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#858279',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: '#F5F5F0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#e8e6dc',
    marginHorizontal: 14,
  },
})
```

- [ ] **Step 2: Lint**

```bash
cd /Users/ilynn/Projects/engineering/vava-backend/myApp && npm run lint 2>&1 | grep "error" | head -10
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/ilynn/Projects/engineering/vava-backend && git add myApp/app/pro/booking-settings.tsx && git commit -m "feat: 預約設定 sub-page"
```

---

### Task 3: 營業基本資料 screen

**Files:**
- Create: `myApp/app/pro/business-info.tsx`

- [ ] **Step 1: Create the screen**

Create `myApp/app/pro/business-info.tsx`:

```tsx
// app/pro/business-info.tsx
import { Alert, ScrollView, TextInput, Pressable, StyleSheet, View } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { FA6ProIcon } from '@/components/FA6ProIcon'
import { useState } from 'react'

const WEEKDAYS = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'] as const
type Weekday = typeof WEEKDAYS[number]
type DayStatus = { open: boolean; hours: string }

const DEFAULT_SCHEDULE: Record<Weekday, DayStatus> = {
  '週一': { open: true,  hours: '11:00 – 20:00' },
  '週二': { open: true,  hours: '11:00 – 20:00' },
  '週三': { open: true,  hours: '11:00 – 20:00' },
  '週四': { open: true,  hours: '11:00 – 20:00' },
  '週五': { open: true,  hours: '11:00 – 20:00' },
  '週六': { open: true,  hours: '11:00 – 20:00' },
  '週日': { open: false, hours: '11:00 – 20:00' },
}

export default function BusinessInfoScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [address, setAddress] = useState('台北市大安區忠孝東路四段')
  const [schedule, setSchedule] = useState<Record<Weekday, DayStatus>>(DEFAULT_SCHEDULE)

  function toggleDay(day: Weekday) {
    const current = schedule[day]
    Alert.alert(day, undefined, [
      { text: '開放', onPress: () => setSchedule(prev => ({ ...prev, [day]: { ...current, open: true } })) },
      { text: '休息', onPress: () => setSchedule(prev => ({ ...prev, [day]: { ...current, open: false } })) },
      { text: '取消', style: 'cancel' as const },
    ])
  }

  return (
    <YStack flex={1} backgroundColor="#FBFBF8">
      <XStack
        paddingTop={insets.top + 16}
        paddingHorizontal={16}
        paddingBottom={12}
        alignItems="center"
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="返回"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, marginRight: 12 })}
        >
          <FA6ProIcon name="chevron-left" size={16} color="#141413" />
        </Pressable>
        <Text fontSize={18} fontWeight="700" color="#141413" flex={1}>營業基本資料</Text>
        <Pressable
          onPress={() => Alert.alert('已儲存')}
          accessibilityLabel="儲存"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Text fontSize={15} fontWeight="600" color="#c96442">儲存</Text>
        </Pressable>
      </XStack>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <Text style={styles.sectionLabel}>營業地址</Text>
        <View style={[styles.card, { paddingHorizontal: 14, paddingVertical: 12 }]}>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="請輸入營業地址"
            placeholderTextColor="#aaa"
            style={{ fontSize: 15, color: '#141413' }}
          />
        </View>

        <Text style={styles.sectionLabel}>營業時間</Text>
        <View style={styles.card}>
          {WEEKDAYS.map((day, i) => {
            const { open, hours } = schedule[day]
            return (
              <View key={day}>
                {i > 0 && <View style={styles.divider} />}
                <Pressable
                  onPress={() => toggleDay(day)}
                  style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text fontSize={15} color="#141413" flex={1}>{day}</Text>
                  <Text fontSize={15} color={open ? '#858279' : '#c96442'} marginRight={6}>
                    {open ? hours : '休息'}
                  </Text>
                  <FA6ProIcon name="chevron-right" size={12} color="#c8c6be" />
                </Pressable>
              </View>
            )
          })}
        </View>
      </ScrollView>
    </YStack>
  )
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#858279',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: '#F5F5F0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#e8e6dc',
    marginHorizontal: 14,
  },
})
```

- [ ] **Step 2: Lint**

```bash
cd /Users/ilynn/Projects/engineering/vava-backend/myApp && npm run lint 2>&1 | grep "error" | head -10
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/ilynn/Projects/engineering/vava-backend && git add myApp/app/pro/business-info.tsx && git commit -m "feat: 營業基本資料 sub-page"
```

---

### Task 4: 個人資料 screen

**Files:**
- Create: `myApp/app/pro/profile.tsx`

- [ ] **Step 1: Create the screen**

Create `myApp/app/pro/profile.tsx`:

```tsx
// app/pro/profile.tsx
import { Alert, ScrollView, TextInput, Pressable, StyleSheet, View } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { FA6ProIcon } from '@/components/FA6ProIcon'
import { useState } from 'react'

const AVATAR_PALETTE = [
  { bg: '#DFF5AD', fg: '#3d3d3a' },
  { bg: '#808868', fg: '#ffffff' },
  { bg: '#9472DE', fg: '#ffffff' },
  { bg: '#CDB5FF', fg: '#3d3d3a' },
  { bg: '#A4CFFB', fg: '#3d3d3a' },
  { bg: '#F063B4', fg: '#ffffff' },
  { bg: '#F78B92', fg: '#3d3d3a' },
  { bg: '#F1C9AC', fg: '#3d3d3a' },
]

function getAvatarColor(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length]
}

export default function ProProfileScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [name, setName] = useState('林小姐美甲')
  const [bio, setBio] = useState('專業美甲師，10年經驗，擅長凝膠光療與法式設計。')
  const [phone, setPhone] = useState('0912-345-678')
  const [instagram, setInstagram] = useState('@linmei_nails')
  const [lineId, setLineId] = useState('linmei2024')

  const { bg, fg } = getAvatarColor(name)

  return (
    <YStack flex={1} backgroundColor="#FBFBF8">
      <XStack
        paddingTop={insets.top + 16}
        paddingHorizontal={16}
        paddingBottom={12}
        alignItems="center"
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="返回"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, marginRight: 12 })}
        >
          <FA6ProIcon name="chevron-left" size={16} color="#141413" />
        </Pressable>
        <Text fontSize={18} fontWeight="700" color="#141413" flex={1}>個人資料</Text>
        <Pressable
          onPress={() => Alert.alert('已儲存')}
          accessibilityLabel="儲存"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Text fontSize={15} fontWeight="600" color="#c96442">儲存</Text>
        </Pressable>
      </XStack>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Photo row */}
        <Pressable
          onPress={() => Alert.alert('更換大頭照', '即將推出')}
          accessibilityLabel="更換大頭照"
          style={({ pressed }) => [styles.photoRow, { opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={[styles.avatar, { backgroundColor: bg }]}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: fg }}>{name[0] ?? '?'}</Text>
          </View>
          <Text fontSize={14} fontWeight="600" color="#c96442">更換大頭照</Text>
        </Pressable>
        <View style={styles.fullDivider} />

        <Text style={styles.sectionLabel}>基本資訊</Text>
        <View style={styles.card}>
          <XStack paddingHorizontal={14} paddingVertical={12} alignItems="center">
            <Text fontSize={15} color="#858279" width={72}>顯示名稱</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="請輸入顯示名稱"
              placeholderTextColor="#aaa"
              style={styles.input}
            />
          </XStack>
          <View style={styles.divider} />
          <XStack paddingHorizontal={14} paddingVertical={12} alignItems="flex-start">
            <Text fontSize={15} color="#858279" width={72} paddingTop={2}>簡介</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="介紹自己和你的服務風格"
              placeholderTextColor="#aaa"
              multiline
              numberOfLines={3}
              style={[styles.input, { height: 64, textAlignVertical: 'top' }]}
            />
          </XStack>
        </View>

        <Text style={styles.sectionLabel}>聯絡方式</Text>
        <View style={styles.card}>
          <XStack paddingHorizontal={14} paddingVertical={12} alignItems="center">
            <Text fontSize={15} color="#858279" width={72}>電話</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="09XX-XXX-XXX"
              placeholderTextColor="#aaa"
              keyboardType="phone-pad"
              style={styles.input}
            />
          </XStack>
          <View style={styles.divider} />
          <XStack paddingHorizontal={14} paddingVertical={12} alignItems="center">
            <Text fontSize={15} color="#858279" width={72}>Instagram</Text>
            <TextInput
              value={instagram}
              onChangeText={setInstagram}
              placeholder="@yourhandle"
              placeholderTextColor="#aaa"
              autoCapitalize="none"
              style={styles.input}
            />
          </XStack>
          <View style={styles.divider} />
          <XStack paddingHorizontal={14} paddingVertical={12} alignItems="center">
            <Text fontSize={15} color="#858279" width={72}>Line ID</Text>
            <TextInput
              value={lineId}
              onChangeText={setLineId}
              placeholder="your_line_id"
              placeholderTextColor="#aaa"
              autoCapitalize="none"
              style={styles.input}
            />
          </XStack>
        </View>
      </ScrollView>
    </YStack>
  )
}

const styles = StyleSheet.create({
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullDivider: {
    height: 1,
    backgroundColor: '#e8e6dc',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#858279',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: '#F5F5F0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#141413',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#e8e6dc',
    marginHorizontal: 14,
  },
})
```

- [ ] **Step 2: Lint**

```bash
cd /Users/ilynn/Projects/engineering/vava-backend/myApp && npm run lint 2>&1 | grep "error" | head -10
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/ilynn/Projects/engineering/vava-backend && git add myApp/app/pro/profile.tsx && git commit -m "feat: 個人資料 sub-page"
```

---

### Task 5: 通知設定 screen

**Files:**
- Create: `myApp/app/pro/notifications.tsx`

Note: `expo-notifications` is not installed. Push state is simulated with a `useState` boolean defaulting to `false` (push off). `Linking.openSettings()` from `expo-linking` (already installed) opens iOS Settings.

- [ ] **Step 1: Create the screen**

Create `myApp/app/pro/notifications.tsx`:

```tsx
// app/pro/notifications.tsx
import { Linking, ScrollView, Switch, Pressable, StyleSheet, View } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { FA6ProIcon } from '@/components/FA6ProIcon'
import { useState } from 'react'

// expo-notifications not installed — mock push state.
// Default false so the "push off" UI is visible in dev.
const MOCK_PUSH_ENABLED = false

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [pushEnabled] = useState(MOCK_PUSH_ENABLED)
  const [newBooking, setNewBooking] = useState(true)
  const [cancellation, setCancellation] = useState(true)
  const [reminder, setReminder] = useState(false)

  return (
    <YStack flex={1} backgroundColor="#FBFBF8">
      <XStack
        paddingTop={insets.top + 16}
        paddingHorizontal={16}
        paddingBottom={12}
        alignItems="center"
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="返回"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, marginRight: 12 })}
        >
          <FA6ProIcon name="chevron-left" size={16} color="#141413" />
        </Pressable>
        <Text fontSize={18} fontWeight="700" color="#141413" flex={1}>通知設定</Text>
      </XStack>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 40,
        }}
      >
        {!pushEnabled ? (
          <View style={styles.emptyCard}>
            <FA6ProIcon name="bell" size={28} color="#858279" weight="regular" />
            <Text fontSize={16} fontWeight="700" color="#141413" marginTop={12} marginBottom={6}>
              推播通知已關閉
            </Text>
            <Text
              fontSize={13}
              color="#858279"
              textAlign="center"
              lineHeight={20}
              marginBottom={16}
            >
              開啟後，即可收到新預約、取消及提醒通知
            </Text>
            <Pressable
              onPress={() => Linking.openSettings()}
              accessibilityLabel="前往開啟通知"
              style={({ pressed }) => [styles.ctaButton, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Text fontSize={14} fontWeight="600" color="#fff">前往開啟通知 →</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <XStack paddingHorizontal={14} paddingVertical={14} alignItems="center">
              <Text fontSize={15} color="#141413" flex={1}>新預約</Text>
              <Switch
                value={newBooking}
                onValueChange={setNewBooking}
                trackColor={{ false: '#d8d6ce', true: '#c96442' }}
                thumbColor="#fff"
              />
            </XStack>
            <View style={styles.divider} />
            <XStack paddingHorizontal={14} paddingVertical={14} alignItems="center">
              <Text fontSize={15} color="#141413" flex={1}>取消通知</Text>
              <Switch
                value={cancellation}
                onValueChange={setCancellation}
                trackColor={{ false: '#d8d6ce', true: '#c96442' }}
                thumbColor="#fff"
              />
            </XStack>
            <View style={styles.divider} />
            <XStack paddingHorizontal={14} paddingVertical={14} alignItems="center">
              <Text fontSize={15} color="#141413" flex={1}>服務提醒</Text>
              <Switch
                value={reminder}
                onValueChange={setReminder}
                trackColor={{ false: '#d8d6ce', true: '#c96442' }}
                thumbColor="#fff"
              />
            </XStack>
          </View>
        )}
      </ScrollView>
    </YStack>
  )
}

const styles = StyleSheet.create({
  emptyCard: {
    backgroundColor: '#F5F5F0',
    borderRadius: 12,
    padding: 28,
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#F5F5F0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: '#e8e6dc',
    marginHorizontal: 14,
  },
  ctaButton: {
    backgroundColor: '#141413',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
})
```

- [ ] **Step 2: Lint**

```bash
cd /Users/ilynn/Projects/engineering/vava-backend/myApp && npm run lint 2>&1 | grep "error" | head -10
```

Expected: 0 errors.

- [ ] **Step 3: Run full test suite**

```bash
cd /Users/ilynn/Projects/engineering/vava-backend/myApp && npm test -- --no-coverage 2>&1 | tail -8
```

Expected: 20/20 pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/ilynn/Projects/engineering/vava-backend && git add myApp/app/pro/notifications.tsx && git commit -m "feat: 通知設定 sub-page"
```
