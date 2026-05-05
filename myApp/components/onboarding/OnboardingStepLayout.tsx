// components/onboarding/OnboardingStepLayout.tsx
import { type ReactNode, useEffect, useState } from 'react'
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
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
  const [keyboardShown, setKeyboardShown] = useState(false)

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const show = Keyboard.addListener(showEvent, () => setKeyboardShown(true))
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardShown(false))
    return () => { show.remove(); hide.remove() }
  }, [])

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header: outside KAV so it never shifts with keyboard */}
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
        <View style={styles.headerBtn} />
      </View>

      {/* KAV only wraps scroll + CTA so its frame is correct */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text fontSize={30} fontWeight="600" lineHeight={38} color="#1F2723">
            {title}
          </Text>
          {subtitle ? (
            <Text fontSize={15} lineHeight={22} color="#626765" marginTop={6}>
              {subtitle}
            </Text>
          ) : null}
          <View style={{ marginTop: 8, flex: 1 }}>
            {children}
          </View>
        </ScrollView>

        {/* CTA — sits just above keyboard */}
        <View style={[styles.cta, { paddingBottom: keyboardShown ? 12 : insets.bottom + 16 }]}>
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
      </KeyboardAvoidingView>
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
    paddingBottom: 16,
    flexGrow: 1,
  },
  cta: { paddingHorizontal: 20, paddingTop: 12, gap: 12 },
  skipLink: { alignItems: 'center', paddingVertical: 4 },
  nextBtn: {
    height: 52,
    backgroundColor: '#1F2723',
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
