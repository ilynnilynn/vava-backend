import { type ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { YStack, XStack, Text, ScrollView } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useNavigation } from '@react-navigation/native'
import { AppIcon } from '@/components/AppIcon'
import { ProgressBar } from './ProgressBar'
import { useBookingRequest } from '@/lib/booking-context'
import { useCTABottom } from '@/lib/useCTABottom'
import { useKeyboardHeight } from '@/lib/useKeyboardHeight'

const CTA_HEIGHT = 48   // button height
const FOOTER_TOP = 12   // breathing room above button inside the footer

type Props = {
  title: string
  subtitle?: string
  currentStep: number
  totalSteps: number
  onNext?: () => void
  nextLabel?: string
  nextDisabled?: boolean
  noScroll?: boolean
  scrollEnabled?: boolean
  hideBack?: boolean
  children: ReactNode
}

export function StepLayout({
  title,
  subtitle,
  currentStep,
  totalSteps,
  onNext,
  nextLabel = '下一步',
  nextDisabled = false,
  noScroll = false,
  scrollEnabled = true,
  hideBack = false,
  children,
}: Props) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const rootNav = useNavigation().getParent()
  const { state, dispatch } = useBookingRequest()
  const ctaBottom = useCTABottom()
  const keyboardHeight = useKeyboardHeight()

  function handleClose() {
    if (state.isEditing) {
      dispatch({ type: 'SET_EDITING', payload: false })
      router.push('/book/results')
    } else {
      dispatch({ type: 'RESET' })
      rootNav?.goBack()
    }
  }

  // scrollPaddingBottom must clear the full footer (FOOTER_TOP + CTA + gap/safe-area)
  // so the last content item can always scroll above the footer background.
  const scrollPaddingBottom = keyboardHeight > 0
    ? FOOTER_TOP + CTA_HEIGHT + 28   // footer visible height above keyboard + buffer
    : FOOTER_TOP + CTA_HEIGHT + insets.bottom + 40  // footer height + buffer

  return (
    <YStack flex={1} backgroundColor="#FBFBF8">
      {/* Header */}
      <YStack paddingTop={insets.top}>
        <XStack height={48} alignItems="center" paddingLeft={12} paddingRight={16}>
          {hideBack ? (
            <View style={{ width: 44 }} />
          ) : (
            <Pressable
              onPress={() => router.back()}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
              accessibilityRole="button"
              accessibilityLabel="返回"
            >
              <AppIcon name="back" size={20} color="#1F2723" />
            </Pressable>
          )}
          <YStack flex={1} alignItems="center">
            <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
          </YStack>
          <Pressable
            onPress={handleClose}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            accessibilityRole="button"
            accessibilityLabel="關閉"
          >
            <AppIcon name="close" size={24} color="#1F2723" />
          </Pressable>
        </XStack>
      </YStack>

      {/* Title */}
      <YStack paddingLeft={20} paddingRight={16} paddingTop={24} paddingBottom={8} gap={8}>
        <Text fontSize={30} fontWeight="600" lineHeight={38} color="#1F2723">
          {title}
        </Text>
        {subtitle && (
          <Text fontSize={15} lineHeight={22} color="#787D7B">
            {subtitle}
          </Text>
        )}
      </YStack>

      {/* Content */}
      {noScroll ? (
        <YStack flex={1} paddingHorizontal={16} paddingBottom={scrollPaddingBottom}>
          {children}
        </YStack>
      ) : (
        <ScrollView
          flex={1}
          scrollEnabled={scrollEnabled}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 16,
            paddingBottom: scrollPaddingBottom,
          }}
        >
          {children}
        </ScrollView>
      )}

      {/* CTA footer — anchored to physical bottom, background covers content behind it */}
      {onNext && (
        <View style={[styles.ctaFooter, { paddingBottom: ctaBottom }]}>
          <Pressable
            onPress={onNext}
            disabled={nextDisabled}
            accessibilityRole="button"
            accessibilityLabel={nextLabel}
            style={({ pressed }) => ({
              borderRadius: 9999,
              height: CTA_HEIGHT,
              backgroundColor: '#1F2723',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: nextDisabled ? 0.4 : pressed ? 0.75 : 1,
            })}
          >
            <Text fontSize={16} fontWeight="600" color="#FBFBF8">
              {nextLabel}
            </Text>
          </Pressable>
        </View>
      )}
    </YStack>
  )
}

const styles = StyleSheet.create({
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
})
