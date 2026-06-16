// components/onboarding/ValueIllustrations.tsx
// Icon-based illustrations for value/marketing onboarding pages.
// Uses FA6 Pro icons composed into visual blocks with VAVA theme colours.
import { StyleSheet, View } from 'react-native'
import { Text } from 'tamagui'
import { VavaLogo } from '@/components/vava-logo'
import { FA6ProIcon } from '@/components/FA6ProIcon'

// ─── Shared ──────────────────────────────────────────────

function IconCircle({
  icon,
  bg,
  color = '#FBFBF8',
  size = 56,
  iconSize = 24,
}: {
  icon: string
  bg: string
  color?: string
  size?: number
  iconSize?: number
}) {
  return (
    <View
      style={[
        styles.iconCircle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
    >
      <FA6ProIcon name={icon} size={iconSize} color={color} weight="solid" />
    </View>
  )
}

// ─── New User Illustrations ──────────────────────────────

/** Page 1: Welcome / Hero — VAVA logo with accent ring */
export function WelcomeHeroIllustration() {
  return (
    <View style={styles.centered}>
      <View style={styles.heroRing}>
        <VavaLogo size={64} color="#FF5A3C" />
      </View>
      <View style={[styles.floatingBadge, { top: 12, right: 0 }]}>
        <IconCircle icon="hand-sparkles" bg="#DFF5AD" color="#1F2723" size={44} iconSize={20} />
      </View>
      <View style={[styles.floatingBadge, { bottom: 12, left: 0 }]}>
        <IconCircle icon="eye" bg="#A8AFFF" color="#1F2723" size={44} iconSize={20} />
      </View>
    </View>
  )
}

/** Page 2: How It Works — 3 step icons in a row */
export function HowItWorksIllustration() {
  return (
    <View style={styles.centered}>
      <View style={styles.stepsRow}>
        <View style={styles.stepItem}>
          <IconCircle icon="magnifying-glass" bg="#FF5A3C" size={56} iconSize={24} />
          <Text fontSize={13} color="#8F9391" marginTop={8} textAlign="center">搜尋</Text>
        </View>

        <View style={styles.stepConnector}>
          <FA6ProIcon name="chevron-right" size={14} color="#D2D3D3" weight="solid" />
        </View>

        <View style={styles.stepItem}>
          <IconCircle icon="calendar-check" bg="#1F2723" size={56} iconSize={24} />
          <Text fontSize={13} color="#8F9391" marginTop={8} textAlign="center">預約</Text>
        </View>

        <View style={styles.stepConnector}>
          <FA6ProIcon name="chevron-right" size={14} color="#D2D3D3" weight="solid" />
        </View>

        <View style={styles.stepItem}>
          <IconCircle icon="star" bg="#DFF5AD" color="#1F2723" size={56} iconSize={24} />
          <Text fontSize={13} color="#8F9391" marginTop={8} textAlign="center">變美</Text>
        </View>
      </View>
    </View>
  )
}

/** Page 3: Quality & Trust — shield + star + verified */
export function QualityTrustIllustration() {
  return (
    <View style={styles.centered}>
      <IconCircle icon="shield-check" bg="#ECF0E4" color="#1F2723" size={80} iconSize={36} />
      <View style={styles.trustBadges}>
        <View style={styles.trustBadge}>
          <FA6ProIcon name="check" size={14} color="#33CC87" weight="solid" />
          <Text fontSize={14} color="#1F2723" marginLeft={6}>認證美容師</Text>
        </View>
        <View style={styles.trustBadge}>
          <FA6ProIcon name="star" size={14} color="#FF5A3C" weight="solid" />
          <Text fontSize={14} color="#1F2723" marginLeft={6}>真實評價</Text>
        </View>
        <View style={styles.trustBadge}>
          <FA6ProIcon name="image-polaroid" size={14} color="#A8AFFF" weight="solid" />
          <Text fontSize={14} color="#1F2723" marginLeft={6}>作品集展示</Text>
        </View>
      </View>
    </View>
  )
}

/** Page 4: Get Started — service icons grid */
export function GetStartedIllustration() {
  return (
    <View style={styles.centered}>
      <View style={styles.servicesGrid}>
        <View style={styles.serviceCard}>
          <IconCircle icon="hand-sparkles" bg="#FF5A3C" size={52} iconSize={22} />
          <Text fontSize={14} fontWeight="600" color="#1F2723" marginTop={8}>美甲</Text>
        </View>
        <View style={styles.serviceCard}>
          <IconCircle icon="eye" bg="#A8AFFF" size={52} iconSize={22} />
          <Text fontSize={14} fontWeight="600" color="#1F2723" marginTop={8}>美睫</Text>
        </View>
      </View>
    </View>
  )
}

// ─── Become-a-Pro Illustrations ──────────────────────────

/** Pro Page 1: Earn on Your Schedule — calendar + clock */
export function EarnScheduleIllustration() {
  return (
    <View style={styles.centered}>
      <IconCircle icon="calendar-days" bg="#DFF5AD" color="#1F2723" size={80} iconSize={36} />
      <View style={[styles.floatingBadge, { top: 8, right: 16 }]}>
        <IconCircle icon="clock" bg="#353C38" size={44} iconSize={20} />
      </View>
      <View style={[styles.floatingBadge, { bottom: 8, left: 16 }]}>
        <IconCircle icon="dollar-sign" bg="#33CC87" size={44} iconSize={20} />
      </View>
    </View>
  )
}

/** Pro Page 2: Grow Your Business — growth icons */
export function GrowBusinessIllustration() {
  return (
    <View style={styles.centered}>
      <View style={styles.stepsRow}>
        <View style={styles.stepItem}>
          <IconCircle icon="magnifying-glass" bg="#A8AFFF" color="#1F2723" size={52} iconSize={22} />
          <Text fontSize={13} color="#8F9391" marginTop={8} textAlign="center">曝光</Text>
        </View>
        <View style={styles.stepItem}>
          <IconCircle icon="image-polaroid" bg="#FF5A3C" size={52} iconSize={22} />
          <Text fontSize={13} color="#8F9391" marginTop={8} textAlign="center">作品集</Text>
        </View>
        <View style={styles.stepItem}>
          <IconCircle icon="star" bg="#DFF5AD" color="#1F2723" size={52} iconSize={22} />
          <Text fontSize={13} color="#8F9391" marginTop={8} textAlign="center">評價</Text>
        </View>
      </View>
    </View>
  )
}

/** Pro Page 3: Simple & Fair — transparent pricing icons */
export function SimpleFairIllustration() {
  return (
    <View style={styles.centered}>
      <IconCircle icon="tag" bg="#ECF0E4" color="#1F2723" size={80} iconSize={36} />
      <View style={styles.trustBadges}>
        <View style={styles.trustBadge}>
          <FA6ProIcon name="check" size={14} color="#33CC87" weight="solid" />
          <Text fontSize={14} color="#1F2723" marginLeft={6}>透明定價</Text>
        </View>
        <View style={styles.trustBadge}>
          <FA6ProIcon name="bell" size={14} color="#FF5A3C" weight="solid" />
          <Text fontSize={14} color="#1F2723" marginLeft={6}>即時通知</Text>
        </View>
        <View style={styles.trustBadge}>
          <FA6ProIcon name="calendar" size={14} color="#A8AFFF" weight="solid" />
          <Text fontSize={14} color="#1F2723" marginLeft={6}>簡易管理</Text>
        </View>
      </View>
    </View>
  )
}

/** Pro Page 4: Join VAVA — logo with pro badge */
export function JoinVavaIllustration() {
  return (
    <View style={styles.centered}>
      <View style={styles.heroRing}>
        <VavaLogo size={64} color="#1F2723" />
      </View>
      <View style={[styles.floatingBadge, { bottom: 4, right: 8 }]}>
        <IconCircle icon="wand-magic-sparkles" bg="#FF5A3C" size={44} iconSize={20} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: 16,
  },
  heroRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#F3F0EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingBadge: {
    position: 'absolute',
  },
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepItem: {
    alignItems: 'center',
  },
  stepConnector: {
    paddingBottom: 20,
  },
  trustBadges: {
    marginTop: 20,
    gap: 10,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F0EA',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  servicesGrid: {
    flexDirection: 'row',
    gap: 20,
  },
  serviceCard: {
    alignItems: 'center',
    backgroundColor: '#F3F0EA',
    paddingHorizontal: 28,
    paddingVertical: 20,
    borderRadius: 16,
  },
})
