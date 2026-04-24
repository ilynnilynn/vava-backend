import { type ReactNode } from 'react'
import { Pressable } from 'react-native'
import { YStack, XStack, Text, ScrollView, View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useNavigation } from '@react-navigation/native'
import { FA6ProIcon } from '@/components/FA6ProIcon'

import { ProgressBar } from './ProgressBar'
import { useBookingRequest } from '@/lib/booking-context'

type Props = {
  title: string
  subtitle?: string
  currentStep: number
  totalSteps: number
  onNext?: () => void
  nextLabel?: string
  nextDisabled?: boolean
  noScroll?: boolean
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
  hideBack = false,
  children,
}: Props) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const rootNav = useNavigation().getParent()
  const { state, dispatch } = useBookingRequest()

  function handleClose() {
    if (state.isEditing) {
      dispatch({ type: 'SET_EDITING', payload: false })
      router.push('/book/results')
    } else {
      dispatch({ type: 'RESET' })
      rootNav?.goBack()
    }
  }

  return (
    <YStack flex={1} backgroundColor="#F0EDE5">
      {/* Header zone: back button + progress dots + spacer */}
      <YStack paddingTop={insets.top}>
        <XStack height={48} alignItems="center" paddingLeft={12} paddingRight={16}>
          {hideBack ? (
            <View width={44} />
          ) : (
            <Pressable
              onPress={() => router.back()}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
              accessibilityRole="button"
              accessibilityLabel="返回"
            >
              <FA6ProIcon name="chevron-left" size={20} color="#1F2723" />
            </Pressable>
          )}
          <View flex={1} alignItems="center">
            <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
          </View>
          <Pressable
            onPress={handleClose}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            accessibilityRole="button"
            accessibilityLabel="關閉"
          >
            <FA6ProIcon name="xmark" size={24} color="#1F2723" />
          </Pressable>
        </XStack>
      </YStack>

      {/* Question heading */}
      <YStack paddingLeft={20} paddingRight={16} paddingTop={24} paddingBottom={8} gap={12}>
        <Text fontSize={30} fontWeight="600" lineHeight={38} color="#1F2723">
          {title}
        </Text>
        {subtitle && (
          <Text fontSize={15} lineHeight={22} color="#858279">
            {subtitle}
          </Text>
        )}
      </YStack>

      {/* Content */}
      {noScroll ? (
        <YStack flex={1} paddingHorizontal={16} paddingBottom={24}>
          {children}
        </YStack>
      ) : (
        <ScrollView
          flex={1}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 16,
            paddingBottom: 24,
          }}
        >
          {children}
        </ScrollView>
      )}

      {/* Bottom CTA */}
      {onNext && (
        <YStack
          paddingHorizontal={16}
          paddingTop={12}
          paddingBottom={insets.bottom + 12}
          backgroundColor="#F0EDE5"
        >
          <Pressable
            onPress={onNext}
            disabled={nextDisabled}
            accessibilityRole="button"
            accessibilityLabel={nextLabel}
            style={({ pressed }) => ({
              borderRadius: 9999,
              height: 48,
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
        </YStack>
      )}
    </YStack>
  )
}
