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
