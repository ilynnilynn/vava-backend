import { type ReactNode } from 'react'
import { Pressable } from 'react-native'
import { YStack, XStack, Text, ScrollView, View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'

import { ProgressBar } from './ProgressBar'

type Props = {
  title: string
  subtitle?: string
  currentStep: number
  totalSteps: number
  onNext?: () => void
  nextLabel?: string
  nextDisabled?: boolean
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
  children,
}: Props) {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  return (
    <YStack flex={1} backgroundColor="#FBFBF8">
      {/* Header */}
      <YStack paddingTop={insets.top} gap={12} paddingBottom={16}>
        <XStack
          height={48}
          alignItems="center"
          paddingHorizontal={16}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityLabel="返回"
          >
            <ChevronLeft size={24} color="#1F2723" />
          </Pressable>
          <View flex={1} alignItems="center">
            <Text fontSize={16} fontWeight="600" color="#1F2723">
              {title}
            </Text>
          </View>
          {/* Spacer to balance back button */}
          <View width={44} />
        </XStack>
        <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
        {subtitle && (
          <Text
            fontSize={13}
            color="#808868"
            textAlign="center"
            paddingHorizontal={16}
          >
            {subtitle}
          </Text>
        )}
      </YStack>

      {/* Scrollable content */}
      <ScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
      >
        {children}
      </ScrollView>

      {/* Bottom CTA */}
      {onNext && (
        <YStack
          paddingHorizontal={16}
          paddingTop={12}
          paddingBottom={insets.bottom + 12}
          backgroundColor="#FBFBF8"
        >
          <Pressable
            onPress={onNext}
            disabled={nextDisabled}
            style={{
              borderRadius: 9999,
              height: 44,
              backgroundColor: '#1F2723',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: nextDisabled ? 0.4 : 1,
            }}
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
