// components/persistent-tab-bar.tsx
// Persistent overlay tab bar rendered at the root layout level.
// Stays visible on all screens; system modals (fullScreenModal, Modal) render above it naturally.

import { Platform, Pressable, StyleSheet, View } from 'react-native'
import { BlurView } from 'expo-blur'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useSegments } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { AppIcon } from '@/components/AppIcon'
import type { AppIconName } from '@/constants/iconMap'
import { useRole } from '@/lib/role-context'

const ACTIVE_COLOR = '#1A1A1A'
const INACTIVE_COLOR = 'rgba(0,0,0,0.4)'
const CONTAINER_RADIUS = 40
const INNER_PADDING = 6
const ACTIVE_RADIUS = CONTAINER_RADIUS - INNER_PADDING

type Tab = {
  name: string   // segment name used for active detection
  icon: AppIconName
  route: string  // full expo-router path for navigation
  label: string  // accessibility label
}

const CUSTOMER_TABS: Tab[] = [
  { name: 'index',    icon: 'home',     route: '/(tabs)/',         label: 'Home' },
  { name: 'bookings', icon: 'calendar', route: '/(tabs)/bookings', label: 'Bookings' },
  { name: 'account',  icon: 'user',     route: '/(tabs)/account',  label: 'Account' },
]

const PRO_TABS: Tab[] = [
  { name: 'slots',    icon: 'time',     route: '/(pro-tabs)/slots',    label: '時段' },
  { name: 'bookings', icon: 'calendar', route: '/(pro-tabs)/bookings', label: '預約' },
  { name: 'account',  icon: 'user',     route: '/(pro-tabs)/account',  label: '帳號' },
]

// Screens where the tab bar should be hidden entirely.
// 'book' is a fullScreenModal but we hide explicitly for Android safety.
const HIDE_ON_SEGMENTS = new Set(['book', '(auth)', '(onboarding)'])

// Map current segments to the active tab name.
// Sub-pages are associated with their logical parent tab.
function getActiveTabName(segments: string[]): string | null {
  const seg0 = segments[0] as string | undefined
  const seg1 = segments[1] as string | undefined

  if (seg0 === '(tabs)') return seg1 ?? 'index'
  if (seg0 === '(pro-tabs)') return seg1 ?? 'slots'

  // Sub-pages → logical parent tab
  if (seg0 === 'booking') return 'bookings'
  if (seg0 === 'account') return 'account'
  if (seg0 === 'notifications') return 'account'
  if (seg0 === 'pro') return 'account'

  return null
}

// Returns true only if we are already sitting exactly on this tab's root screen.
// Prevents pushing a duplicate screen onto the stack.
function isExactlyOnTab(tab: Tab, isProMode: boolean, segments: string[]): boolean {
  const seg0 = segments[0] as string | undefined
  const seg1 = segments[1] as string | undefined
  const group = isProMode ? '(pro-tabs)' : '(tabs)'
  if (seg0 !== group) return false
  if (tab.name === 'index') return seg1 === 'index' || seg1 === undefined
  return seg1 === tab.name
}

export function PersistentTabBar() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const segments = useSegments() as string[]
  const { activeRole } = useRole()

  const isProMode = activeRole === 'pro'
  const tabs = isProMode ? PRO_TABS : CUSTOMER_TABS
  const activeTabName = getActiveTabName(segments)

  // Hide on booking flow and any future full-screen flows
  if (HIDE_ON_SEGMENTS.has(segments[0])) return null

  // Hide on root index (splash gate — segments is empty array)
  if (segments.length === 0) return null

  function onPress(tab: Tab) {
    if (isExactlyOnTab(tab, isProMode, segments)) return // already there
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    router.replace(tab.route as never)
  }

  return (
    <View
      style={[styles.shadowCarrier, { bottom: insets.bottom - 8 }]}
      pointerEvents="box-none"
    >
      <View style={styles.container}>
        {/* Glass base */}
        {Platform.OS === 'ios' ? (
          <BlurView intensity={18} tint="light" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(245,241,235,0.96)' }]} />
        )}
        <View style={styles.overlay} pointerEvents="none" />
        <View style={styles.topHighlight} pointerEvents="none" />
        <View style={styles.border} pointerEvents="none" />

        <View style={styles.row}>
          {tabs.map((tab) => {
            const isFocused = activeTabName === tab.name
            const color = isFocused ? ACTIVE_COLOR : INACTIVE_COLOR
            return (
              <Pressable
                key={tab.name}
                onPress={() => onPress(tab)}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={tab.label}
                style={[styles.tab, isFocused && styles.tabActive]}
              >
                <AppIcon
                  name={tab.icon}
                  size={24}
                  color={color}
                  weight={isFocused ? 'solid' : 'regular'}
                />
              </Pressable>
            )
          })}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  shadowCarrier: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    borderRadius: CONTAINER_RADIUS,
    zIndex: 100,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  container: {
    height: 61,
    borderRadius: CONTAINER_RADIUS,
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CONTAINER_RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    padding: INNER_PADDING,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: ACTIVE_RADIUS,
  },
  tabActive: {
    backgroundColor: 'rgba(232,233,233,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
  },
})
