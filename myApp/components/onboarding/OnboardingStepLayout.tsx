// components/onboarding/OnboardingStepLayout.tsx
import { type ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { AppIcon } from '@/components/AppIcon'
import { ProgressBar } from '@/components/booking/ProgressBar'
import { useCTABottom } from '@/lib/useCTABottom'

const CTA_HEIGHT = 52   // button height
const FOOTER_TOP = 12   // breathing room above button inside the footer

type Props = {
  title: string
  subtitle?: string
  step: number
  totalSteps: number
  onNext: () => void
  nextLabel?: string
  nextDisabled?: boolean
  onSkip?: () => void
  onBack?: () => void
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
  onBack,
  children,
}: Props) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const ctaBottom = useCTABottom()

  return (
    <View
      style={[styles.container, { paddingTop: insets.top }]}
      onLayout={(e) => {
        const { height } = e.nativeEvent.layout
        console.log(`[B002] step=${step} container_h=${Math.round(height)} insets_bottom=${insets.bottom} ctaBottom=${ctaBottom}`)
      }}
    >
      {/* Header */}
      <View style={styles.header}>
        {(onBack || router.canGoBack()) ? (
          <Pressable
            onPress={onBack ?? (() => router.back())}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="返回"
          >
            <AppIcon name="back" size={20} color="#1F2723" />
          </Pressable>
        ) : (
          <View style={styles.headerBtn} />
        )}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <ProgressBar currentStep={step} totalSteps={totalSteps} />
        </View>
        {onSkip ? (
          <Pressable
            onPress={onSkip}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="略過"
          >
            <AppIcon name="close" size={20} color="#8F9391" weight="regular" />
          </Pressable>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      {/* Scrollable content — paddingBottom keeps last item above the absolute CTA */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: FOOTER_TOP + CTA_HEIGHT + insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <Text fontSize={30} fontWeight="600" lineHeight={38} color="#1F2723">
          {title}
        </Text>
        {subtitle ? (
          <Text fontSize={15} lineHeight={22} color="#8F9391" marginTop={6}>
            {subtitle}
          </Text>
        ) : null}
        <View style={{ marginTop: 8, flex: 1 }}>
          {children}
        </View>
      </ScrollView>

      {/* CTA footer — anchored to physical bottom, background covers content behind it */}
      <View
        style={[styles.ctaFooter, { paddingBottom: ctaBottom }]}
        onLayout={(e) => {
          const { y, height } = e.nativeEvent.layout
          console.log(`[B002] step=${step} ctaBottom=${ctaBottom} footer_y=${Math.round(y)} footer_h=${Math.round(height)}`)
        }}
      >
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
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 16,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    flexGrow: 1,
  },
  ctaFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: FOOTER_TOP,
    paddingHorizontal: 20,
    backgroundColor: '#FBFBF8',
    zIndex: 10,
  },
  nextBtn: {
    height: 52,
    backgroundColor: '#1F2723',
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
