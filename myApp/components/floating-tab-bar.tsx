import { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { BlurView } from 'expo-blur'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { FA6ProIcon } from '@/components/FA6ProIcon'

const ACTIVE_COLOR = '#1A1A1A'
const INACTIVE_COLOR = 'rgba(0,0,0,0.4)'

const CONTAINER_RADIUS = 40
const INNER_PADDING = 6
const ACTIVE_RADIUS = CONTAINER_RADIUS - INNER_PADDING // 34

// ── Default customer tab config ────────────────────────────────
const DEFAULT_ICON_NAMES: Record<string, string> = {
  index: 'house',
  bookings: 'calendar',
  account: 'user',
}

const DEFAULT_LABELS: Record<string, string> = {
  index: 'Home',
  bookings: 'Bookings',
  account: 'Account',
}

type TabBarConfig = {
  iconNames?: Record<string, string>
  labels?: Record<string, string>
}

export function FloatingTabBar({ state, navigation, iconNames, labels }: BottomTabBarProps & TabBarConfig) {
  const insets = useSafeAreaInsets()

  return (
    // Shadow carrier — shadow cannot coexist with overflow: hidden on the same view (iOS RN).
    <View
      style={[
        styles.shadowCarrier,
        { bottom: insets.bottom - 8 },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.container}>
        {/* Glass base layer */}
        {Platform.OS === 'ios' ? (
          <BlurView intensity={18} tint="light" style={StyleSheet.absoluteFill} />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: 'rgba(245,241,235,0.96)' },
            ]}
          />
        )}

        {/* Translucent white overlay */}
        <View style={styles.overlay} pointerEvents="none" />

        {/* Top edge highlight */}
        <View style={styles.topHighlight} pointerEvents="none" />

        {/* Hairline border */}
        <View style={styles.border} pointerEvents="none" />

        {/* Inner row — padded so the active bubble has equal inset on all sides */}
        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index
            const resolvedIcons = iconNames ?? DEFAULT_ICON_NAMES
            const resolvedLabels = labels ?? DEFAULT_LABELS
            const iconName = resolvedIcons[route.name] ?? 'house'
            const label = resolvedLabels[route.name] ?? route.name
            const color = isFocused ? ACTIVE_COLOR : INACTIVE_COLOR

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              })
              if (Platform.OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              }
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params)
              }
            }

            const onLongPress = () => {
              navigation.emit({ type: 'tabLongPress', target: route.key })
            }

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                onLongPress={onLongPress}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={label}
                style={[styles.tab, isFocused && styles.tabActive]}
              >
                <FA6ProIcon
                  name={iconName}
                  size={22}
                  color={color}
                  weight={isFocused ? 'solid' : 'regular'}
                />
                <Text
                  style={[
                    styles.label,
                    isFocused && styles.labelActive,
                    { color },
                  ]}
                >
                  {label}
                </Text>
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
      android: {
        elevation: 8,
      },
    }),
  },
  container: {
    height: 61, // 51 * 1.2 — 20% taller
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
    padding: INNER_PADDING, // equal inset on all sides for active bubble
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: ACTIVE_RADIUS,
    gap: 2,
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
  },
  label: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '400',
  },
  labelActive: {
    fontWeight: '600',
  },
})
