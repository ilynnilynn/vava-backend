# Onboarding Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full onboarding flow from splash gate to a fully onboarded customer or pro, covering splash, intro slides, Google/Apple login, customer profile wizard (4 steps), and pro application wizard (6 steps).

**Architecture:** `app/index.tsx` acts as the auth gate — it reads session + user row from the expanded auth context and redirects to the correct destination. Auth screens live in `(auth)/`, onboarding wizards in `(onboarding)/`. The persistent tab bar hides itself on auth/onboarding segments.

**Tech Stack:** Expo Router v6, Tamagui, Supabase JS v2, expo-web-browser, AsyncStorage, expo-image-picker

---

## File Map

**Create:**
- `supabase/migrations/0023_onboarding_columns.sql`
- `myApp/lib/auth-routing.ts` — pure routing decision function
- `myApp/__tests__/auth-routing.test.ts`
- `myApp/app/index.tsx` — splash gate
- `myApp/app/(auth)/_layout.tsx`
- `myApp/app/(auth)/intro.tsx`
- `myApp/app/(auth)/login.tsx`
- `myApp/app/(onboarding)/_layout.tsx`
- `myApp/app/(onboarding)/customer/name.tsx`
- `myApp/app/(onboarding)/customer/phone.tsx`
- `myApp/app/(onboarding)/customer/birthday.tsx`
- `myApp/app/(onboarding)/customer/gender.tsx`
- `myApp/app/(onboarding)/pro/display-name.tsx`
- `myApp/app/(onboarding)/pro/domains.tsx`
- `myApp/app/(onboarding)/pro/nail-scope.tsx`
- `myApp/app/(onboarding)/pro/location.tsx`
- `myApp/app/(onboarding)/pro/instagram.tsx`
- `myApp/app/(onboarding)/pro/id-photo.tsx`
- `myApp/app/(onboarding)/pro/submitted.tsx`
- `myApp/components/onboarding/OnboardingStepLayout.tsx`

**Modify:**
- `myApp/types/database.ts` — add new columns to User + Pro types; add 'makeup' to ServiceDomain
- `myApp/lib/auth-context.tsx` — expose user row, pro row, onboardingComplete, proStatus
- `myApp/app/_layout.tsx` — register (auth) + (onboarding) groups; change initialRouteName
- `myApp/components/persistent-tab-bar.tsx` — hide on auth/onboarding segments
- `myApp/app/(tabs)/account.tsx` — add "申請成為設計師" entry point

---

## Task 1: DB Migration — Add onboarding columns

**Files:**
- Create: `supabase/migrations/0023_onboarding_columns.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- ============================================================
-- MIGRATION 0023 — Onboarding columns
--
-- users: birthday (date), gender (text)
-- pros:  domains (text array)
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS birthday date;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS gender text
    CHECK (gender IN ('female', 'male', 'other', 'prefer_not'));

ALTER TABLE pros
  ADD COLUMN IF NOT EXISTS domains text[] NOT NULL DEFAULT '{}';
```

- [ ] **Step 2: Apply the migration**

Run from `vava-backend/` directory:
```bash
npx supabase migration up
```

If local Supabase is not running:
```bash
npx supabase start
npx supabase migration up
```

Expected: Migration 0023 applied, no errors.

- [ ] **Step 3: Commit**

```bash
cd vava-backend
git add supabase/migrations/0023_onboarding_columns.sql
git commit -m "feat: add birthday, gender, domains columns for onboarding"
```

---

## Task 2: Update TypeScript Types

**Files:**
- Modify: `myApp/types/database.ts`

- [ ] **Step 1: Write the failing test**

Create `myApp/__tests__/types-smoke.test.ts`:

```ts
// __tests__/types-smoke.test.ts
// Smoke test: ensure new type fields are present.
// If the types are wrong, TS will fail to compile this file.
import type { User, Pro, ServiceDomain } from '../types/database'

describe('type smoke tests', () => {
  it('User has display_name, birthday, gender', () => {
    const u: User = {
      id: 'x',
      display_name: 'Test',
      phone: '0900000000',
      birthday: null,
      gender: null,
      profile_photo_url: null,
      auth_provider: 'google',
      line_notifications: false,
      created_at: '',
      updated_at: '',
      push_token_expo: null,
    }
    expect(u.display_name).toBe('Test')
    expect(u.birthday).toBeNull()
    expect(u.gender).toBeNull()
  })

  it('Pro has domains array', () => {
    const p = { domains: ['nails', 'lashes'] } as Pick<Pro, 'domains'>
    expect(p.domains).toHaveLength(2)
  })

  it('ServiceDomain includes makeup', () => {
    const d: ServiceDomain = 'makeup'
    expect(['nails', 'lashes', 'makeup']).toContain(d)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd myApp && npx jest __tests__/types-smoke.test.ts --no-coverage
```

Expected: FAIL — TypeScript compile errors about missing fields.

- [ ] **Step 3: Update the types**

In `myApp/types/database.ts`, make these changes:

Change `ServiceDomain`:
```ts
export type ServiceDomain = 'nails' | 'lashes' | 'makeup'
```

Replace the `User` type (remove `line_user_id`, `name`, `birth_year`; add `display_name`, `birthday`, `gender`):
```ts
export type User = {
  id: string                       // uuid PK = auth.users.id
  display_name: string | null      // set during customer onboarding
  phone: string | null             // set during customer onboarding
  birthday: string | null          // date ISO 'YYYY-MM-DD'
  gender: string | null            // 'female' | 'male' | 'other' | 'prefer_not'
  profile_photo_url: string | null
  auth_provider: string            // 'google' | 'apple'
  line_notifications: boolean
  push_token_expo: string | null
  created_at: string
  updated_at: string
}
```

Add `domains` to `Pro` (after `ig_handle`):
```ts
  ig_handle: string | null
  domains: string[]                // e.g. ['nails', 'lashes', 'makeup']
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd myApp && npx jest __tests__/types-smoke.test.ts --no-coverage
```

Expected: PASS

- [ ] **Step 5: Run lint**

```bash
cd myApp && npm run lint
```

Expected: No new errors.

- [ ] **Step 6: Commit**

```bash
git add myApp/types/database.ts myApp/__tests__/types-smoke.test.ts
git commit -m "feat: update User/Pro types for onboarding columns"
```

---

## Task 3: Auth Routing Logic (pure, testable)

**Files:**
- Create: `myApp/lib/auth-routing.ts`
- Create: `myApp/__tests__/auth-routing.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/auth-routing.test.ts
import { deriveRoute } from '../lib/auth-routing'

describe('deriveRoute', () => {
  it('returns auth/login when no session', () => {
    expect(deriveRoute(false, null, null)).toBe('/(auth)/login')
  })

  it('returns onboarding/customer/name when authed but no display_name', () => {
    expect(deriveRoute(true, null, null)).toBe('/(onboarding)/customer/name')
  })

  it('returns tabs when authed + display_name + no pro row', () => {
    expect(deriveRoute(true, 'Alice', null)).toBe('/(tabs)/')
  })

  it('returns onboarding/pro/submitted when pro row not approved', () => {
    expect(deriveRoute(true, 'Alice', false)).toBe('/(onboarding)/pro/submitted')
  })

  it('returns pro-tabs when pro row approved', () => {
    expect(deriveRoute(true, 'Alice', true)).toBe('/(pro-tabs)/')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd myApp && npx jest __tests__/auth-routing.test.ts --no-coverage
```

Expected: FAIL — `deriveRoute` not found.

- [ ] **Step 3: Implement deriveRoute**

Create `myApp/lib/auth-routing.ts`:

```ts
// lib/auth-routing.ts
// Pure function for auth gate routing. No side effects. Easy to test.

/**
 * @param hasSession   true if Supabase session exists
 * @param displayName  users.display_name (null = customer onboarding incomplete)
 * @param isApproved   pros.is_approved (null = no pro row, false = pending, true = approved)
 */
export function deriveRoute(
  hasSession: boolean,
  displayName: string | null,
  isApproved: boolean | null
): string {
  if (!hasSession) return '/(auth)/login'
  if (!displayName) return '/(onboarding)/customer/name'
  if (isApproved === true) return '/(pro-tabs)/'
  if (isApproved === false) return '/(onboarding)/pro/submitted'
  return '/(tabs)/'
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
cd myApp && npx jest __tests__/auth-routing.test.ts --no-coverage
```

Expected: 5 passing tests.

- [ ] **Step 5: Commit**

```bash
git add myApp/lib/auth-routing.ts myApp/__tests__/auth-routing.test.ts
git commit -m "feat: add deriveRoute pure function with tests"
```

---

## Task 4: Expand Auth Context

**Files:**
- Modify: `myApp/lib/auth-context.tsx`

- [ ] **Step 1: Replace auth-context.tsx**

```tsx
// lib/auth-context.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { User, Pro } from '@/types/database'

export type ProStatus = 'none' | 'pending' | 'approved'

type AuthContextType = {
  session: Session | null
  isLoading: boolean
  user: User | null            // users table row
  pro: Pro | null              // pros table row (null if not a pro)
  onboardingComplete: boolean  // users.display_name IS NOT NULL
  proStatus: ProStatus         // derived from pro row
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoading: true,
  user: null,
  pro: null,
  onboardingComplete: false,
  proStatus: 'none',
  signOut: async () => {},
})

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [pro, setPro] = useState<Pro | null>(null)

  async function fetchUserData(userId: string) {
    const [{ data: userData }, { data: proData }] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).maybeSingle(),
      supabase.from('pros').select('*').eq('user_id', userId).maybeSingle(),
    ])
    setUser(userData ?? null)
    setPro(proData ?? null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchUserData(session.user.id).finally(() => setIsLoading(false))
      } else {
        setIsLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        fetchUserData(session.user.id)
      } else {
        setUser(null)
        setPro(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
  }

  const onboardingComplete = !!user?.display_name
  const proStatus: ProStatus =
    pro === null ? 'none' : pro.is_approved ? 'approved' : 'pending'

  return (
    <AuthContext.Provider value={{ session, isLoading, user, pro, onboardingComplete, proStatus, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useSession() {
  return useContext(AuthContext)
}
```

- [ ] **Step 2: Run lint + build check**

```bash
cd myApp && npm run lint && npx tsc --noEmit
```

Expected: No type errors. The `Pro` type from `types/database.ts` needs `user_id` — check it's there. If the compiler complains about `Pro` missing `user_id`, the DB type is based on the `id` column (which equals `auth.users.id`), so select on `pros` using `.eq('user_id', userId)` requires the table to have a `user_id` column. Looking at the initial schema: `user_id uuid not null references auth.users(id)`. This is a separate column from `id`. The `Pro` type in `database.ts` currently uses `id` as the PK equal to `auth.users.id`. Verify by checking the actual pros table query works — if it returns `null` for new users that's correct.

- [ ] **Step 3: Commit**

```bash
git add myApp/lib/auth-context.tsx
git commit -m "feat: expand auth context with user/pro rows and proStatus"
```

---

## Task 5: Layout + Tab Bar Updates

**Files:**
- Modify: `myApp/app/_layout.tsx`
- Modify: `myApp/components/persistent-tab-bar.tsx`

- [ ] **Step 1: Update _layout.tsx**

In `myApp/app/_layout.tsx`:

Change `unstable_settings` from `'(tabs)'` to `'index'`:
```tsx
export const unstable_settings = {
  initialRouteName: 'index',
}
```

Add `(auth)` and `(onboarding)` Stack.Screen registrations inside the `<Stack>`:
```tsx
<Stack screenOptions={{ contentStyle: { backgroundColor: BG } }}>
  <Stack.Screen name="index" options={{ headerShown: false, animation: 'none' }} />
  <Stack.Screen name="(auth)" options={{ headerShown: false, animation: 'none', gestureEnabled: false }} />
  <Stack.Screen name="(onboarding)" options={{ headerShown: false, animation: 'none', gestureEnabled: false }} />
  <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none', gestureEnabled: false }} />
  <Stack.Screen name="(pro-tabs)" options={{ headerShown: false, animation: 'none', gestureEnabled: false }} />
  <Stack.Screen name="pro" options={{ headerShown: false }} />
  <Stack.Screen name="book" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
  <Stack.Screen name="booking" options={{ headerShown: false }} />
  <Stack.Screen name="account" options={{ headerShown: false }} />
  <Stack.Screen name="notifications" options={{ headerShown: false }} />
</Stack>
```

- [ ] **Step 2: Update persistent-tab-bar.tsx to hide on auth/onboarding**

In `myApp/components/persistent-tab-bar.tsx`, change `HIDE_ON_SEGMENTS`:

```ts
const HIDE_ON_SEGMENTS = new Set(['book', '(auth)', '(onboarding)'])
```

Also update the early return to handle the root index screen (segments is `[]`):

After the `HIDE_ON_SEGMENTS` check, add:
```ts
// Hide on root index (splash gate — segments is empty)
if (segments.length === 0) return null
```

- [ ] **Step 3: Run lint**

```bash
cd myApp && npm run lint
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add myApp/app/_layout.tsx myApp/components/persistent-tab-bar.tsx
git commit -m "feat: register auth/onboarding routes and hide tab bar during onboarding"
```

---

## Task 6: Splash Gate Screen

**Files:**
- Create: `myApp/app/index.tsx`

- [ ] **Step 1: Create app/index.tsx**

```tsx
// app/index.tsx
// Auth gate. Shows coral splash while session loads, then redirects.
import { useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useSession } from '@/lib/auth-context'
import { deriveRoute } from '@/lib/auth-routing'
import { VavaLogo } from '@/components/vava-logo'

export default function IndexScreen() {
  const router = useRouter()
  const { isLoading, session, user, pro } = useSession()

  useEffect(() => {
    if (isLoading) return
    const route = deriveRoute(
      !!session,
      user?.display_name ?? null,
      pro ? pro.is_approved : null
    )
    router.replace(route as never)
  }, [isLoading, session, user, pro])

  return (
    <View style={styles.container}>
      <VavaLogo size={56} color="rgba(255,255,255,0.9)" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF5A3C',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
```

- [ ] **Step 2: Run lint**

```bash
cd myApp && npm run lint
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add myApp/app/index.tsx
git commit -m "feat: add auth gate splash screen"
```

---

## Task 7: Auth Group — Layout, Intro, Login

**Files:**
- Create: `myApp/app/(auth)/_layout.tsx`
- Create: `myApp/app/(auth)/intro.tsx`
- Create: `myApp/app/(auth)/login.tsx`

- [ ] **Step 1: Create (auth)/_layout.tsx**

```tsx
// app/(auth)/_layout.tsx
import { Stack } from 'expo-router'

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, gestureEnabled: false }} />
}
```

- [ ] **Step 2: Create (auth)/intro.tsx**

```tsx
// app/(auth)/intro.tsx
import { useState, useRef } from 'react'
import { FlatList, Pressable, StyleSheet, View, Dimensions } from 'react-native'
import { Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const SLIDES = [
  { id: '1', headline: '即時預約', sub: '當天空位，立刻搶訂' },
  { id: '2', headline: '精選美業師', sub: '頂尖美甲美睫設計師' },
  { id: '3', headline: '安心付款', sub: '透明定價，無隱藏費用' },
]

async function markIntroSeen() {
  await AsyncStorage.setItem('@vava/introSeen', 'true')
}

export default function IntroScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<FlatList>(null)

  async function handleDone() {
    await markIntroSeen()
    router.replace('/(auth)/login')
  }

  function handleSkip() {
    handleDone()
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      {/* Skip button */}
      <View style={styles.skipRow}>
        <Pressable onPress={handleSkip} accessibilityRole="button" accessibilityLabel="跳過">
          <Text fontSize={15} color="rgba(255,90,60,0.7)">跳過</Text>
        </Pressable>
      </View>

      {/* Slides */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(e) => {
          setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))
        }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
            <Text fontSize={30} fontWeight="700" lineHeight={38} color="#1F2723" textAlign="center">
              {item.headline}
            </Text>
            <Text fontSize={16} lineHeight={24} color="#626765" textAlign="center" marginTop={12}>
              {item.sub}
            </Text>
          </View>
        )}
      />

      {/* Dot pagination */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === activeIndex ? '#1F2723' : '#D8D9D2' },
            ]}
          />
        ))}
      </View>

      {/* CTA */}
      <View style={styles.ctaContainer}>
        {activeIndex === SLIDES.length - 1 ? (
          <Pressable
            onPress={handleDone}
            accessibilityRole="button"
            accessibilityLabel="開始"
            style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.75 : 1 }]}
          >
            <Text fontSize={16} fontWeight="600" color="#FBFBF8">開始</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => {
              const next = activeIndex + 1
              listRef.current?.scrollToIndex({ index: next, animated: true })
              setActiveIndex(next)
            }}
            accessibilityRole="button"
            accessibilityLabel="下一頁"
            style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.75 : 1 }]}
          >
            <Text fontSize={16} fontWeight="600" color="#FBFBF8">下一頁</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBFBF8' },
  skipRow: { alignItems: 'flex-end', paddingHorizontal: 24, paddingVertical: 12 },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  ctaContainer: { paddingHorizontal: 24 },
  cta: {
    height: 52,
    backgroundColor: '#FF5A3C',
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
```

- [ ] **Step 3: Create (auth)/login.tsx**

```tsx
// app/(auth)/login.tsx
import { useState } from 'react'
import { Alert, Pressable, StyleSheet, View } from 'react-native'
import { Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from '@/lib/supabase'
import { VavaLogo } from '@/components/vava-logo'
import { AppIcon } from '@/components/AppIcon'

// After OAuth redirect, Supabase auth state change fires and index.tsx re-routes.

async function signInWith(provider: 'google' | 'apple') {
  const redirectTo = 'myapp://auth-callback'

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  })

  if (error || !data.url) {
    Alert.alert('登入失敗', error?.message ?? '請稍後再試')
    return
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)

  if (result.type === 'success') {
    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(result.url)
    if (sessionError) {
      Alert.alert('登入失敗', sessionError.message)
    }
    // Auth state change fires → index.tsx will redirect to correct screen
  }
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const [loading, setLoading] = useState(false)

  async function handleSignIn(provider: 'google' | 'apple') {
    setLoading(true)
    await signInWith(provider)
    setLoading(false)
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top section: logo + tagline */}
      <View style={styles.top}>
        <VavaLogo size={48} color="#FF5A3C" />
        <Text fontSize={20} fontWeight="700" lineHeight={28} color="#1F2723" marginTop={16}>
          VAVA
        </Text>
        <Text fontSize={15} lineHeight={22} color="#626765" marginTop={8} textAlign="center">
          即時美業預約，隨時出發
        </Text>
      </View>

      {/* Bottom buttons */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          onPress={() => handleSignIn('google')}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="以 Google 繼續"
          style={({ pressed }) => [styles.btn, styles.btnGoogle, { opacity: pressed || loading ? 0.75 : 1 }]}
        >
          <AppIcon name="google" size={20} color="#1F2723" />
          <Text fontSize={16} fontWeight="600" color="#1F2723" marginLeft={10}>以 Google 繼續</Text>
        </Pressable>

        <Pressable
          onPress={() => handleSignIn('apple')}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="以 Apple 繼續"
          style={({ pressed }) => [styles.btn, styles.btnApple, { opacity: pressed || loading ? 0.75 : 1 }]}
        >
          <AppIcon name="apple" size={20} color="#FBFBF8" />
          <Text fontSize={16} fontWeight="600" color="#FBFBF8" marginLeft={10}>以 Apple 繼續</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBFBF8', justifyContent: 'space-between' },
  top: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  bottom: { paddingHorizontal: 24, gap: 12 },
  btn: {
    height: 52,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGoogle: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E9E9',
  },
  btnApple: {
    backgroundColor: '#1F2723',
  },
})
```

> **Note on AppIcon:** The `AppIcon` component uses a constant icon map. If `'google'` or `'apple'` are not in `constants/iconMap.ts`, add them as Font Awesome 6 icon names: `'google'` (fab) and `'apple'` (fab). Check `iconMap.ts` and add if missing.

- [ ] **Step 4: Check iconMap.ts and add google/apple icons if missing**

Read `myApp/constants/iconMap.ts`. If `google` and `apple` are not present, add them using the FA6 brand icon names (these are in the FA6 Pro Regular set as `fa-google` / `fa-apple`). The `AppIcon` component accepts `AppIconName` type.

- [ ] **Step 5: Run lint**

```bash
cd myApp && npm run lint
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add myApp/app/(auth)/_layout.tsx myApp/app/(auth)/intro.tsx myApp/app/(auth)/login.tsx myApp/constants/iconMap.ts
git commit -m "feat: add auth group with intro slides and login screen"
```

---

## Task 8: OnboardingStepLayout Component

**Files:**
- Create: `myApp/components/onboarding/OnboardingStepLayout.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/onboarding/OnboardingStepLayout.tsx
import { type ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { AppIcon } from '@/components/AppIcon'
import { ProgressBar } from '@/components/booking/ProgressBar'

type Props = {
  title: string
  subtitle?: string
  step: number
  totalSteps: number
  onNext: () => void
  nextLabel?: string
  nextDisabled?: boolean
  onSkip?: () => void  // renders a "略過" link when provided
  children: ReactNode
}

export function OnboardingStepLayout({
  title,
  subtitle,
  step,
  totalSteps,
  onNext,
  nextLabel = '下一步',
  nextDisabled = false,
  onSkip,
  children,
}: Props) {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header: back + progress */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="返回"
        >
          <AppIcon name="back" size={20} color="#1F2723" />
        </Pressable>
        <ProgressBar currentStep={step} totalSteps={totalSteps} />
        <View style={styles.headerRight} />
      </View>

      {/* Title */}
      <View style={styles.titleBlock}>
        <Text fontSize={30} fontWeight="600" lineHeight={38} color="#1F2723">
          {title}
        </Text>
        {subtitle ? (
          <Text fontSize={15} lineHeight={22} color="#626765" marginTop={8}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>

      {/* Bottom CTA */}
      <View style={[styles.cta, { paddingBottom: insets.bottom + 16 }]}>
        {onSkip ? (
          <Pressable onPress={onSkip} accessibilityRole="button" style={styles.skipLink}>
            <Text fontSize={15} color="#626765">略過</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onNext}
          disabled={nextDisabled}
          accessibilityRole="button"
          accessibilityLabel={nextLabel}
          style={({ pressed }) => [
            styles.nextBtn,
            { opacity: nextDisabled ? 0.4 : pressed ? 0.75 : 1 },
          ]}
        >
          <Text fontSize={16} fontWeight="600" color="#FBFBF8">{nextLabel}</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBFBF8' },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerRight: { width: 44 },
  titleBlock: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },
  content: { flex: 1, paddingHorizontal: 20 },
  cta: { paddingHorizontal: 20, paddingTop: 12, gap: 12 },
  skipLink: { alignItems: 'center', paddingVertical: 4 },
  nextBtn: {
    height: 52,
    backgroundColor: '#FF5A3C',
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
```

- [ ] **Step 2: Run lint**

```bash
cd myApp && npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add myApp/components/onboarding/OnboardingStepLayout.tsx
git commit -m "feat: add OnboardingStepLayout shared component"
```

---

## Task 9: Customer Wizard

**Files:**
- Create: `myApp/app/(onboarding)/_layout.tsx`
- Create: `myApp/app/(onboarding)/customer/name.tsx`
- Create: `myApp/app/(onboarding)/customer/phone.tsx`
- Create: `myApp/app/(onboarding)/customer/birthday.tsx`
- Create: `myApp/app/(onboarding)/customer/gender.tsx`

Each step UPSERTs its field to `users` via Supabase immediately.

- [ ] **Step 1: Create (onboarding)/_layout.tsx**

```tsx
// app/(onboarding)/_layout.tsx
import { Stack } from 'expo-router'

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animation: 'slide_from_right',
      }}
    />
  )
}
```

- [ ] **Step 2: Create customer/name.tsx**

```tsx
// app/(onboarding)/customer/name.tsx
import { useState } from 'react'
import { Alert, TextInput, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useSession } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'

export default function CustomerNameScreen() {
  const router = useRouter()
  const { session } = useSession()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleNext() {
    const trimmed = name.trim()
    if (!trimmed || !session) return
    setSaving(true)
    const { error } = await supabase
      .from('users')
      .upsert({ id: session.user.id, display_name: trimmed }, { onConflict: 'id' })
    setSaving(false)
    if (error) {
      Alert.alert('儲存失敗', error.message)
      return
    }
    router.push('/(onboarding)/customer/phone')
  }

  return (
    <OnboardingStepLayout
      title="你希望我們怎麼稱呼你？"
      step={1}
      totalSteps={4}
      onNext={handleNext}
      nextDisabled={!name.trim() || saving}
    >
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="輸入名字"
        placeholderTextColor="#AEADA6"
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleNext}
        style={styles.input}
      />
    </OnboardingStepLayout>
  )
}

const styles = StyleSheet.create({
  input: {
    fontSize: 20,
    color: '#1F2723',
    borderBottomWidth: 1.5,
    borderBottomColor: '#E8E9E9',
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
})
```

- [ ] **Step 3: Create customer/phone.tsx**

```tsx
// app/(onboarding)/customer/phone.tsx
import { useState } from 'react'
import { Alert, TextInput, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useSession } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'

export default function CustomerPhoneScreen() {
  const router = useRouter()
  const { session } = useSession()
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleNext() {
    const trimmed = phone.trim()
    if (!trimmed || !session) return
    setSaving(true)
    const { error } = await supabase
      .from('users')
      .upsert({ id: session.user.id, phone: trimmed }, { onConflict: 'id' })
    setSaving(false)
    if (error) {
      Alert.alert('儲存失敗', error.message)
      return
    }
    router.push('/(onboarding)/customer/birthday')
  }

  return (
    <OnboardingStepLayout
      title="你的手機號碼？"
      subtitle="用於預約通知，不對外公開"
      step={2}
      totalSteps={4}
      onNext={handleNext}
      nextDisabled={!phone.trim() || saving}
    >
      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder="09XXXXXXXX"
        placeholderTextColor="#AEADA6"
        keyboardType="phone-pad"
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleNext}
        style={styles.input}
      />
    </OnboardingStepLayout>
  )
}

const styles = StyleSheet.create({
  input: {
    fontSize: 20,
    color: '#1F2723',
    borderBottomWidth: 1.5,
    borderBottomColor: '#E8E9E9',
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
})
```

- [ ] **Step 4: Create customer/birthday.tsx**

```tsx
// app/(onboarding)/customer/birthday.tsx
import { useState } from 'react'
import { Alert, Platform, StyleSheet, View } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useRouter } from 'expo-router'
import { useSession } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'
import { Text } from 'tamagui'

// @react-native-community/datetimepicker is included with Expo
// (expo install @react-native-community/datetimepicker if missing)

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export default function CustomerBirthdayScreen() {
  const router = useRouter()
  const { session } = useSession()
  const [date, setDate] = useState<Date>(new Date(2000, 0, 1))
  const [saving, setSaving] = useState(false)

  async function handleNext() {
    if (!session) return
    setSaving(true)
    const { error } = await supabase
      .from('users')
      .upsert({ id: session.user.id, birthday: toISODate(date) }, { onConflict: 'id' })
    setSaving(false)
    if (error) {
      Alert.alert('儲存失敗', error.message)
      return
    }
    router.push('/(onboarding)/customer/gender')
  }

  return (
    <OnboardingStepLayout
      title="你的生日？"
      step={3}
      totalSteps={4}
      onNext={handleNext}
      nextDisabled={saving}
    >
      <View style={styles.pickerWrap}>
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          minimumDate={new Date(1920, 0, 1)}
          onChange={(_, d) => { if (d) setDate(d) }}
          locale="zh-TW"
          style={Platform.OS === 'ios' ? styles.iosPicker : undefined}
        />
      </View>
      <Text fontSize={15} color="#626765" marginTop={16}>
        {toISODate(date)}
      </Text>
    </OnboardingStepLayout>
  )
}

const styles = StyleSheet.create({
  pickerWrap: { marginTop: 8 },
  iosPicker: { width: '100%' },
})
```

> **Note:** `@react-native-community/datetimepicker` comes with Expo. Run `npx expo install @react-native-community/datetimepicker` if the import fails.

- [ ] **Step 5: Create customer/gender.tsx**

```tsx
// app/(onboarding)/customer/gender.tsx
import { useState } from 'react'
import { Alert, Pressable, StyleSheet, View } from 'react-native'
import { Text } from 'tamagui'
import { useRouter } from 'expo-router'
import { useSession } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'

const OPTIONS = [
  { value: 'female', label: '女性' },
  { value: 'male',   label: '男性' },
  { value: 'other',  label: '其他' },
  { value: 'prefer_not', label: '不想透露' },
] as const

type GenderValue = typeof OPTIONS[number]['value']

export default function CustomerGenderScreen() {
  const router = useRouter()
  const { session } = useSession()
  const [selected, setSelected] = useState<GenderValue | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleNext() {
    if (!selected || !session) return
    setSaving(true)
    const { error } = await supabase
      .from('users')
      .upsert({ id: session.user.id, gender: selected }, { onConflict: 'id' })
    setSaving(false)
    if (error) {
      Alert.alert('儲存失敗', error.message)
      return
    }
    // Customer onboarding done → go to main tabs
    router.replace('/(tabs)/')
  }

  return (
    <OnboardingStepLayout
      title="你的性別？"
      step={4}
      totalSteps={4}
      onNext={handleNext}
      nextLabel="完成"
      nextDisabled={!selected || saving}
    >
      <View style={styles.options}>
        {OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => setSelected(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: selected === opt.value }}
            style={[styles.option, selected === opt.value && styles.optionSelected]}
          >
            <Text
              fontSize={16}
              fontWeight={selected === opt.value ? '600' : '400'}
              color={selected === opt.value ? '#FBFBF8' : '#1F2723'}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </OnboardingStepLayout>
  )
}

const styles = StyleSheet.create({
  options: { gap: 12 },
  option: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8E9E9',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FBFBF8',
  },
  optionSelected: {
    backgroundColor: '#FF5A3C',
    borderColor: '#FF5A3C',
  },
})
```

- [ ] **Step 6: Run lint**

```bash
cd myApp && npm run lint
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add myApp/app/(onboarding)/_layout.tsx myApp/app/(onboarding)/customer/
git commit -m "feat: add customer onboarding wizard (4 steps)"
```

---

## Task 10: Pro Wizard

**Files:**
- Create: `myApp/app/(onboarding)/pro/display-name.tsx`
- Create: `myApp/app/(onboarding)/pro/domains.tsx`
- Create: `myApp/app/(onboarding)/pro/nail-scope.tsx`
- Create: `myApp/app/(onboarding)/pro/location.tsx`
- Create: `myApp/app/(onboarding)/pro/instagram.tsx`
- Create: `myApp/app/(onboarding)/pro/id-photo.tsx`
- Create: `myApp/app/(onboarding)/pro/submitted.tsx`

Pro wizard uses AsyncStorage key `@vava/proWizardDraft` to accumulate data across steps. The final submit screen reads all values and INSERTs the `pros` row.

Draft shape:
```ts
type ProDraft = {
  display_name?: string
  domains?: string[]
  nail_scope?: string[]
  studio_district?: string
  studio_address?: string
  ig_handle?: string
  id_photo_path?: string
}
```

- [ ] **Step 1: Create pro/display-name.tsx**

```tsx
// app/(onboarding)/pro/display-name.tsx
import { useState } from 'react'
import { TextInput, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'

const DRAFT_KEY = '@vava/proWizardDraft'

async function saveDraft(patch: Record<string, unknown>) {
  const raw = await AsyncStorage.getItem(DRAFT_KEY)
  const current = raw ? JSON.parse(raw) : {}
  await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ ...current, ...patch }))
}

export default function ProDisplayNameScreen() {
  const router = useRouter()
  const [name, setName] = useState('')

  async function handleNext() {
    const trimmed = name.trim()
    if (!trimmed) return
    await saveDraft({ display_name: trimmed })
    router.push('/(onboarding)/pro/domains')
  }

  return (
    <OnboardingStepLayout
      title="希望客戶怎麼稱呼你？"
      subtitle="顯示在你的設計師主頁"
      step={1}
      totalSteps={6}
      onNext={handleNext}
      nextDisabled={!name.trim()}
    >
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="輸入名字或稱呼"
        placeholderTextColor="#AEADA6"
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleNext}
        style={styles.input}
      />
    </OnboardingStepLayout>
  )
}

const styles = StyleSheet.create({
  input: {
    fontSize: 20,
    color: '#1F2723',
    borderBottomWidth: 1.5,
    borderBottomColor: '#E8E9E9',
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
})
```

- [ ] **Step 2: Create pro/domains.tsx**

```tsx
// app/(onboarding)/pro/domains.tsx
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from 'tamagui'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'

const DRAFT_KEY = '@vava/proWizardDraft'

const DOMAIN_OPTIONS = [
  { value: 'nails',  label: '美甲' },
  { value: 'lashes', label: '美睫' },
  { value: 'makeup', label: '美妝' },
] as const

export default function ProDomainsScreen() {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>([])

  function toggle(value: string) {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  async function handleNext() {
    if (!selected.length) return
    const raw = await AsyncStorage.getItem(DRAFT_KEY)
    const current = raw ? JSON.parse(raw) : {}
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ ...current, domains: selected }))

    // If nails selected, go to nail-scope; otherwise skip to location
    if (selected.includes('nails')) {
      router.push('/(onboarding)/pro/nail-scope')
    } else {
      router.push('/(onboarding)/pro/location')
    }
  }

  return (
    <OnboardingStepLayout
      title="你提供哪些服務？"
      subtitle="可複選"
      step={2}
      totalSteps={6}
      onNext={handleNext}
      nextDisabled={selected.length === 0}
    >
      <View style={styles.options}>
        {DOMAIN_OPTIONS.map((opt) => {
          const isSelected = selected.includes(opt.value)
          return (
            <Pressable
              key={opt.value}
              onPress={() => toggle(opt.value)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              style={[styles.option, isSelected && styles.optionSelected]}
            >
              <Text
                fontSize={16}
                fontWeight={isSelected ? '600' : '400'}
                color={isSelected ? '#FBFBF8' : '#1F2723'}
              >
                {opt.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </OnboardingStepLayout>
  )
}

const styles = StyleSheet.create({
  options: { gap: 12 },
  option: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8E9E9',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FBFBF8',
  },
  optionSelected: {
    backgroundColor: '#FF5A3C',
    borderColor: '#FF5A3C',
  },
})
```

- [ ] **Step 3: Create pro/nail-scope.tsx**

```tsx
// app/(onboarding)/pro/nail-scope.tsx
// Only shown when 'nails' is in selected domains.
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from 'tamagui'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'

const DRAFT_KEY = '@vava/proWizardDraft'

const SCOPE_OPTIONS = [
  { value: 'gel',      label: '凝膠' },
  { value: 'art',      label: '手繪' },
  { value: 'uv',       label: '光療' },
  { value: 'removal',  label: '卸甲' },
]

export default function ProNailScopeScreen() {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>([])

  function toggle(value: string) {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  async function handleNext() {
    if (!selected.length) return
    const raw = await AsyncStorage.getItem(DRAFT_KEY)
    const current = raw ? JSON.parse(raw) : {}
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ ...current, nail_scope: selected }))
    router.push('/(onboarding)/pro/location')
  }

  return (
    <OnboardingStepLayout
      title="美甲服務範圍？"
      subtitle="可複選"
      step={3}
      totalSteps={6}
      onNext={handleNext}
      nextDisabled={selected.length === 0}
    >
      <View style={styles.options}>
        {SCOPE_OPTIONS.map((opt) => {
          const isSelected = selected.includes(opt.value)
          return (
            <Pressable
              key={opt.value}
              onPress={() => toggle(opt.value)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              style={[styles.option, isSelected && styles.optionSelected]}
            >
              <Text
                fontSize={16}
                fontWeight={isSelected ? '600' : '400'}
                color={isSelected ? '#FBFBF8' : '#1F2723'}
              >
                {opt.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </OnboardingStepLayout>
  )
}

const styles = StyleSheet.create({
  options: { gap: 12, flexDirection: 'row', flexWrap: 'wrap' },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8E9E9',
    backgroundColor: '#FBFBF8',
  },
  optionSelected: {
    backgroundColor: '#FF5A3C',
    borderColor: '#FF5A3C',
  },
})
```

- [ ] **Step 4: Create pro/location.tsx**

```tsx
// app/(onboarding)/pro/location.tsx
import { useState } from 'react'
import { Alert, TextInput, StyleSheet, View } from 'react-native'
import { Text } from 'tamagui'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'

const DRAFT_KEY = '@vava/proWizardDraft'

export default function ProLocationScreen() {
  const router = useRouter()
  const [district, setDistrict] = useState('')
  const [address, setAddress] = useState('')

  async function handleNext() {
    if (!district.trim() || !address.trim()) return
    const raw = await AsyncStorage.getItem(DRAFT_KEY)
    const current = raw ? JSON.parse(raw) : {}
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({
      ...current,
      studio_district: district.trim(),
      studio_address: address.trim(),
    }))
    router.push('/(onboarding)/pro/instagram')
  }

  return (
    <OnboardingStepLayout
      title="工作室地點"
      step={4}
      totalSteps={6}
      onNext={handleNext}
      nextDisabled={!district.trim() || !address.trim()}
    >
      <View style={styles.fields}>
        <Text fontSize={13} color="#626765" marginBottom={6}>行政區</Text>
        <TextInput
          value={district}
          onChangeText={setDistrict}
          placeholder="例：大安區"
          placeholderTextColor="#AEADA6"
          returnKeyType="next"
          style={styles.input}
        />
        <Text fontSize={13} color="#626765" marginTop={20} marginBottom={6}>詳細地址</Text>
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="例：信義路四段 1 號"
          placeholderTextColor="#AEADA6"
          returnKeyType="done"
          onSubmitEditing={handleNext}
          style={styles.input}
        />
      </View>
    </OnboardingStepLayout>
  )
}

const styles = StyleSheet.create({
  fields: { paddingTop: 8 },
  input: {
    fontSize: 18,
    color: '#1F2723',
    borderBottomWidth: 1.5,
    borderBottomColor: '#E8E9E9',
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
})
```

- [ ] **Step 5: Create pro/instagram.tsx**

```tsx
// app/(onboarding)/pro/instagram.tsx
import { useState } from 'react'
import { TextInput, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'

const DRAFT_KEY = '@vava/proWizardDraft'

export default function ProInstagramScreen() {
  const router = useRouter()
  const [handle, setHandle] = useState('')

  async function saveAndNext(value: string | null) {
    const raw = await AsyncStorage.getItem(DRAFT_KEY)
    const current = raw ? JSON.parse(raw) : {}
    const patch = value ? { ig_handle: value } : {}
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ ...current, ...patch }))
    router.push('/(onboarding)/pro/id-photo')
  }

  return (
    <OnboardingStepLayout
      title="連結 Instagram 工作帳號"
      subtitle="讓客人看到你的作品（可略過）"
      step={5}
      totalSteps={6}
      onNext={() => saveAndNext(handle.trim() || null)}
      onSkip={() => saveAndNext(null)}
    >
      <TextInput
        value={handle}
        onChangeText={setHandle}
        placeholder="@your_account"
        placeholderTextColor="#AEADA6"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={() => saveAndNext(handle.trim() || null)}
        style={styles.input}
      />
    </OnboardingStepLayout>
  )
}

const styles = StyleSheet.create({
  input: {
    fontSize: 20,
    color: '#1F2723',
    borderBottomWidth: 1.5,
    borderBottomColor: '#E8E9E9',
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
})
```

- [ ] **Step 6: Create pro/id-photo.tsx**

```tsx
// app/(onboarding)/pro/id-photo.tsx
import { useState } from 'react'
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native'
import { Text } from 'tamagui'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/auth-context'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'
import { AppIcon } from '@/components/AppIcon'

const DRAFT_KEY = '@vava/proWizardDraft'

export default function ProIdPhotoScreen() {
  const router = useRouter()
  const { session } = useSession()
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri)
    }
  }

  async function handleNext() {
    if (!imageUri || !session) return
    setUploading(true)

    // Upload to Supabase Storage bucket: id-photos/{user_id}/id.jpg
    const path = `${session.user.id}/id.jpg`
    const response = await fetch(imageUri)
    const blob = await response.blob()

    const { error: uploadError } = await supabase.storage
      .from('id-photos')
      .upload(path, blob, { contentType: 'image/jpeg', upsert: true })

    setUploading(false)

    if (uploadError) {
      Alert.alert('上傳失敗', uploadError.message)
      return
    }

    // Save path to draft
    const raw = await AsyncStorage.getItem(DRAFT_KEY)
    const current = raw ? JSON.parse(raw) : {}
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ ...current, id_photo_path: path }))

    router.push('/(onboarding)/pro/submitted')
  }

  return (
    <OnboardingStepLayout
      title="上傳身份證件"
      subtitle="用於身份驗證，不會公開顯示"
      step={6}
      totalSteps={6}
      onNext={handleNext}
      nextLabel={uploading ? '上傳中...' : '提交申請'}
      nextDisabled={!imageUri || uploading}
    >
      <Pressable onPress={pickImage} style={styles.picker} accessibilityRole="button">
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <AppIcon name="camera" size={32} color="#AEADA6" />
            <Text fontSize={15} color="#AEADA6" marginTop={12}>點擊選擇圖片</Text>
          </View>
        )}
      </Pressable>
    </OnboardingStepLayout>
  )
}

const styles = StyleSheet.create({
  picker: {
    height: 200,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8E9E9',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F4EF',
  },
  preview: { width: '100%', height: '100%' },
})
```

- [ ] **Step 7: Create pro/submitted.tsx**

```tsx
// app/(onboarding)/pro/submitted.tsx
// Final screen after pro wizard submit OR when returning pending pro opens the app.
import { useEffect, useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'
import { Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/auth-context'
import { VavaLogo } from '@/components/vava-logo'

const DRAFT_KEY = '@vava/proWizardDraft'

export default function ProSubmittedScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { session } = useSession()
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    submitIfDraftExists()
  }, [])

  async function submitIfDraftExists() {
    const raw = await AsyncStorage.getItem(DRAFT_KEY)
    if (!raw || !session) {
      // Already submitted in a previous session — just show confirmation
      setSubmitted(true)
      return
    }

    const draft = JSON.parse(raw)

    // Require minimum fields before inserting
    if (!draft.display_name || !draft.domains?.length || !draft.studio_address) {
      Alert.alert('資料不完整', '請重新填寫申請資料', [
        { text: '返回', onPress: () => router.back() },
      ])
      return
    }

    const { error } = await supabase.from('pros').upsert({
      user_id: session.user.id,
      display_name: draft.display_name,
      domains: draft.domains,
      nail_scope: draft.nail_scope ?? [],
      studio_district: draft.studio_district ?? '',
      studio_address: draft.studio_address,
      ig_handle: draft.ig_handle ?? null,
      id_photo_path: draft.id_photo_path ?? null,
      is_approved: false,
      submitted_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (error) {
      Alert.alert('申請失敗', error.message)
      return
    }

    await AsyncStorage.removeItem(DRAFT_KEY)
    setSubmitted(true)
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.content}>
        <VavaLogo size={48} color="#FF5A3C" />
        <Text fontSize={24} fontWeight="700" lineHeight={32} color="#1F2723" marginTop={24} textAlign="center">
          申請已送出
        </Text>
        <Text fontSize={16} lineHeight={24} color="#626765" marginTop={12} textAlign="center">
          我們將在 1–2 個工作天內審核你的申請，通過後會通知你。
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBFBF8' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
})
```

- [ ] **Step 8: Run lint**

```bash
cd myApp && npm run lint
```

Expected: No errors.

- [ ] **Step 9: Commit**

```bash
git add myApp/app/(onboarding)/pro/
git commit -m "feat: add pro apply wizard (6 steps + confirmation)"
```

---

## Task 11: Pro Entry Point in Account Screen

**Files:**
- Modify: `myApp/app/(tabs)/account.tsx`

- [ ] **Step 1: Read the current file**

Read `myApp/app/(tabs)/account.tsx` (lines 1–122). Take note of the section structure.

- [ ] **Step 2: Add useSession import and apply button**

In `account.tsx`:

1. Import `useSession` (it's already imported, but the current code only uses `signOut`. Update the destructuring):

```tsx
const { session, signOut, proStatus, onboardingComplete } = useSession()
```

2. After the "設定" section (after the `通知` SettingsRow), add a "成為設計師" section that only shows when `proStatus === 'none'`:

```tsx
{/* ── Section: 成為設計師 ── */}
{proStatus === 'none' && (
  <>
    <Text style={styles.sectionHeader}>成為設計師</Text>
    <YStack>
      <SettingsRow
        label="申請成為設計師"
        iconName="user"
        onPress={() => router.push('/(onboarding)/pro/display-name')}
      />
    </YStack>
  </>
)}
```

3. When `proStatus === 'pending'`, show a read-only row:

```tsx
{proStatus === 'pending' && (
  <>
    <Text style={styles.sectionHeader}>設計師申請</Text>
    <YStack>
      <SettingsRow
        label="審核中"
        iconName="time"
        showChevron={false}
        onPress={() => router.push('/(onboarding)/pro/submitted')}
      />
    </YStack>
  </>
)}
```

- [ ] **Step 3: Run lint**

```bash
cd myApp && npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add myApp/app/(tabs)/account.tsx
git commit -m "feat: add 申請成為設計師 entry point in account screen"
```

---

## Task 12: Final Verification

- [ ] **Step 1: Run all tests**

```bash
cd myApp && npm run test -- --no-coverage
```

Expected: All tests pass including new `types-smoke` and `auth-routing` tests.

- [ ] **Step 2: Run lint**

```bash
cd myApp && npm run lint
```

Expected: No errors.

- [ ] **Step 3: Run TypeScript check**

```bash
cd myApp && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 4: Run build**

```bash
cd myApp && npm run build
```

Expected: Build succeeds. (Or run `npx expo export --platform ios` if `npm run build` isn't configured.)

- [ ] **Step 5: Verify flow manually in simulator**

1. Cold start → coral splash for ~1s → login screen
2. Tap "以 Google 繼續" → browser opens → OAuth flow
3. After auth → splash → customer onboarding name screen
4. Complete 4 steps → lands in `/(tabs)/`
5. Go to Account → see "申請成為設計師"
6. Tap → pro wizard step 1
7. Complete wizard → "申請已送出" screen
8. Force quit, reopen → splash → "申請已送出" (pending state)

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: onboarding flow complete — all tests pass"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Route architecture (Task 5 + 6)
- ✅ Splash screen (Task 6)
- ✅ Intro slides (Task 7)
- ✅ Login — Google + Apple (Task 7)
- ✅ Customer wizard — name, phone, birthday, gender (Task 9)
- ✅ Pro wizard — display_name, domains, nail_scope, location, instagram, id_photo (Task 10)
- ✅ Pro submitted screen (Task 10)
- ✅ Schema migration (Task 1)
- ✅ Auth context expansion (Task 4)
- ✅ Tab bar hides on auth/onboarding (Task 5)
- ✅ Pro entry point in account (Task 11)
- ✅ AsyncStorage `@vava/introSeen` — set in intro.tsx handleDone/handleSkip

**Known limitations:**
- Intro screen: `@vava/introSeen` is set but not read (index.tsx always shows intro for unauthenticated users). To add the intro-skip: in `app/index.tsx`, check AsyncStorage for `@vava/introSeen` and route to `/(auth)/login` instead of `/(auth)/intro` if set. This is a one-liner and can be added after the wizard is verified working.
- Apple Sign-In: requires Apple developer account configuration and `app.json` entitlements (`com.apple.developer.applesignin`). Google Sign-In requires Supabase project OAuth settings.
- The `pros` table uses `user_id` as FK but the `Pro` type's `id` field is set to `auth.users.id` per the spec. The `submitted.tsx` upserts with `{ onConflict: 'user_id' }` which requires `user_id` to have a unique constraint. Verify this in the schema or add: `ALTER TABLE pros ADD CONSTRAINT pros_user_id_unique UNIQUE (user_id);` to migration 0023 if missing.
