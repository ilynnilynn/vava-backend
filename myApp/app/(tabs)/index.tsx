import { useState, useEffect, useRef, useCallback } from 'react'
import { Animated, Alert, Pressable, Platform, ScrollView, StyleSheet } from 'react-native'
import { YStack, XStack, Text, View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Image } from 'expo-image'
import { AppIcon } from '@/components/AppIcon'

import { VavaLogo } from '@/components/vava-logo'
import { useBookingRequest } from '@/lib/booking-context'
import { useProCounts } from '@/hooks/use-pro-counts'

const ROTATING_WORDS = ['美甲', '美睫', '美妝'] as const

const CATEGORIES = [
  { key: 'nails' as const, label: '美甲師', image: require('@/assets/category/nails.png') },
  { key: 'lashes' as const, label: '美睫師', image: require('@/assets/category/lashes.png') },
  { key: 'makeup' as const, label: '美妝師', image: require('@/assets/category/makeup.png') },
]

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { dispatch } = useBookingRequest()
  const { counts } = useProCounts()

  // Rotating word animation
  const [wordIdx, setWordIdx] = useState(0)
  const fadeAnim = useRef(new Animated.Value(1)).current
  const slideAnim = useRef(new Animated.Value(0)).current

  const cycleWord = useCallback(() => {
    // Exit: slide down + fade out
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 20, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setWordIdx((prev) => (prev + 1) % ROTATING_WORDS.length)
      slideAnim.setValue(-20) // reset above
      // Enter: slide in from above + fade in
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start()
    })
  }, [fadeAnim, slideAnim])

  useEffect(() => {
    const interval = setInterval(cycleWord, 2500)
    return () => clearInterval(interval)
  }, [cycleWord])

  function handleCategoryPress(catKey: 'nails' | 'lashes' | 'makeup') {
    dispatch({ type: 'SET_CATEGORY', payload: catKey })
    router.push('/book/location')
  }

  function handleModelBannerPress() {
    Alert.alert('即將推出', '模特機會功能即將上線，敬請期待！')
  }

  // Tab bar: 61px height + positioned at (insets.bottom - 8) from screen bottom
  // = insets.bottom + 53px clearance needed, plus breathing room
  const tabBarClearance = insets.bottom + 72

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FBFBF8' }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ flexGrow: 1, paddingBottom: tabBarClearance }}
    >
      <YStack marginTop={-4}>
        {/* A) Header Bar */}
        <XStack
          paddingTop={insets.top}
          minHeight={insets.top + 48}
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal={16}
        >
          <View width={44} height={44} />
          <VavaLogo size={29} color="#F9583B" />
          <Pressable
            onPress={() => Alert.alert('搜尋', '搜尋功能即將推出')}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            accessibilityRole="button"
            accessibilityLabel="搜尋"
          >
            <AppIcon name="search" size={20} color="#1F2723" />
          </Pressable>
        </XStack>

        {/* B) Hero Section */}
        <YStack alignItems="center" gap={8} paddingBottom={16} paddingHorizontal={16}>
          <Text
            fontSize={24}
            fontWeight="700"
            lineHeight={36}
            letterSpacing={-0.3}
            color="#1F2723"
            textAlign="center"
          >
            臨時需要預約？
          </Text>
          <Text
            fontSize={16}
            fontWeight="500"
            lineHeight={22}
            color="#626765"
            textAlign="center"
          >
            馬上找到有空又符合你需求的設計師
          </Text>
        </YStack>

        {/* C) Request Card */}
        <YStack paddingHorizontal={16} paddingBottom={16}>
          <Pressable
          onPress={() => router.push('/book/category')}
          accessibilityRole="button"
          accessibilityLabel="立即預約"
        >
          <YStack
            borderRadius={8}
            backgroundColor="#F0EDE5"
            minHeight={360}
            overflow="hidden"
            position="relative"
            {...Platform.select({
              ios: {
                shadowColor: '#0C0C0D',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
              },
              android: { elevation: 2 },
            })}
          >
            {/* Raster background layers — decorative, hidden from screen readers */}
            <Image
              source={require('@/assets/hero/gradient.png')}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              accessible={false}
            />
            <Image
              source={require('@/assets/hero/noise.png')}
              style={[StyleSheet.absoluteFill, { opacity: 0.07 }]}
              contentFit="cover"
              accessible={false}
            />
            <Image
              source={require('@/assets/hero/riso_texture.png')}
              style={[StyleSheet.absoluteFill, { opacity: 0.1 }]}
              contentFit="cover"
              accessible={false}
            />

            {/* Card content */}
            <YStack
              zIndex={2}
              paddingTop={24}
              paddingHorizontal={20}
              paddingBottom={16}
              justifyContent="flex-start"
              gap={8}
              height={360}
            >
              {/* Top copy */}
              <XStack alignItems="center">
                <Text
                  fontSize={16}
                  fontWeight="500"
                  lineHeight={24}
                  color="#626765"
                >
                  不再一間一間問，讓設計師來找你！
                </Text>
              </XStack>

              {/* Headline */}
              <YStack flex={1}>
                <Text fontSize={30} fontWeight="700" color="#1F2723" lineHeight={38}>
                  1分鐘填需求．不用等待
                </Text>
                <XStack alignItems="flex-start" gap={2}>
                  <Text fontSize={30} fontWeight="700" color="#1F2723" lineHeight={38}>
                    馬上預約
                  </Text>
                  <View overflow="hidden" height={38}>
                    <Animated.View style={{ transform: [{ translateY: slideAnim }], opacity: fadeAnim }}>
                      <Text fontSize={30} fontWeight="700" color="#FF5A3C" lineHeight={38}>
                        {ROTATING_WORDS[wordIdx]}
                      </Text>
                    </Animated.View>
                  </View>
                </XStack>
              </YStack>

              {/* CTA button */}
              <Pressable
                onPress={() => router.push('/book/category')}
                accessibilityRole="button"
                accessibilityLabel="填寫需求"
                style={({ pressed }) => ({
                  opacity: pressed ? 0.75 : 1,
                  borderRadius: 9999,
                  height: 48,
                  paddingHorizontal: 24,
                  backgroundColor: '#1F2723',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  alignSelf: 'flex-start',
                  gap: 8,
                })}
              >
                <Text
                  fontSize={16}
                  fontWeight="700"
                  color="#FBFBF8"
                >
                  填寫需求
                </Text>
                <AppIcon name="forward" size={14} color="rgba(251,251,248,0.4)" />
              </Pressable>
            </YStack>
          </YStack>
          </Pressable>
        </YStack>

        {/* D) "現在有空" Section — hidden */}

        {/* E) Model Opportunity Banner */}
        <YStack paddingHorizontal={16} paddingBottom={40}>
          <Pressable
          onPress={handleModelBannerPress}
          accessibilityRole="button"
          accessibilityLabel="模特機會 — 變美不用花大錢"
        >
            <YStack
              borderRadius={8}
              backgroundColor="#BA4C8B"
              height={191}
              overflow="hidden"
              position="relative"
            >
              {/* model bundle bg on top of pink base — decorative */}
              <Image
                source={require('@/assets/hero/model_bg.png')}
                style={[StyleSheet.absoluteFill, { opacity: 0.9 }]}
                contentFit="cover"
                contentPosition="center"
                accessible={false}
              />
              <Image
                source={require('@/assets/hero/noise.png')}
                style={[StyleSheet.absoluteFill, { opacity: 0.1 }]}
                contentFit="cover"
                accessible={false}
              />
              <Image
                source={require('@/assets/hero/riso_texture.png')}
                style={[StyleSheet.absoluteFill, { opacity: 0.12 }]}
                contentFit="cover"
                accessible={false}
              />

              {/* Content */}
              <YStack
                position="absolute"
                top={20}
                left={20}
                right={20}
                zIndex={2}
                gap={20}
              >
                {/* Text block */}
                <YStack gap={4}>
                  {/* Header: 模特機會 + New badge */}
                  <XStack alignItems="center" gap={4} paddingVertical={4}>
                    <Text
                      fontSize={16}
                      fontWeight="500"
                      lineHeight={20}
                      color="#FBFBF8"
                    >
                      模特機會
                    </Text>
                    <View
                      backgroundColor="#FEECFB"
                      borderRadius={5}
                      paddingHorizontal={6}
                      paddingVertical={2}
                    >
                      <Text fontSize={12} color="#A5088C">
                        New
                      </Text>
                    </View>
                  </XStack>

                  {/* Title + subtitle */}
                  <YStack gap={4}>
                    <Text
                      fontSize={24}
                      fontWeight="700"
                      lineHeight={32}
                      color="#FBFBF8"
                    >
                      變美不用花大錢
                    </Text>
                    <Text
                      fontSize={16}
                      fontWeight="500"
                      lineHeight={20}
                      color="#E8E9E9"
                    >
                      不介意當練習模特？享練習價甚至免費！
                    </Text>
                  </YStack>
                </YStack>

                {/* CTA button */}
                <Pressable
                  onPress={handleModelBannerPress}
                  style={{
                    borderRadius: 9999,
                    height: 40,
                    paddingHorizontal: 16,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderWidth: 1,
                    borderColor: '#d8d9d2',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    alignSelf: 'flex-start',
                    gap: 8,
                  }}
                >
                  <Text fontSize={16} fontWeight="700" color="#FBFBF8">
                    尋找模特機會
                  </Text>
                  <AppIcon name="forward" size={14} color="rgba(251,251,248,0.4)" />
                </Pressable>
              </YStack>
            </YStack>
          </Pressable>
        </YStack>
      </YStack>
    </ScrollView>
  )
}
