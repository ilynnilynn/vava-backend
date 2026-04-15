import { useState, useEffect, useRef, useCallback } from 'react'
import { Animated, Alert, Pressable } from 'react-native'
import { YStack, XStack, Text, ScrollView, View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Search, ChevronRight, ChevronDown } from 'lucide-react-native'

import { VavaLogo } from '@/components/vava-logo'
import { useBookingRequest } from '@/lib/booking-context'
import { useProCounts } from '@/hooks/use-pro-counts'

const ROTATING_WORDS = ['美甲', '美睫', '美妝'] as const

const CATEGORIES = [
  { key: 'nails' as const, label: '美甲師', image: require('@/assets/images/home/nails.png') },
  { key: 'lashes' as const, label: '美睫師', image: require('@/assets/images/home/lashes.png') },
  { key: 'makeup' as const, label: '美妝師', image: require('@/assets/images/home/makeup.png') },
]

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { dispatch } = useBookingRequest()
  const { counts } = useProCounts()

  // Rotating word animation
  const [wordIdx, setWordIdx] = useState(0)
  const fadeAnim = useRef(new Animated.Value(1)).current

  const cycleWord = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setWordIdx((prev) => (prev + 1) % ROTATING_WORDS.length)
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start()
    })
  }, [fadeAnim])

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

  return (
    <ScrollView
      flex={1}
      backgroundColor="$background"
      showsVerticalScrollIndicator={false}
    >
      <YStack paddingBottom={insets.bottom + 83}>
        {/* A) Header Bar */}
        <XStack
          paddingTop={insets.top}
          height={insets.top + 48}
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal={16}
        >
          <View width={44} height={44} />
          <VavaLogo size={29} color="#F9583B" />
          <Pressable
            onPress={() => Alert.alert('搜尋', '搜尋功能即將推出')}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            accessibilityLabel="Search"
          >
            <Search size={22} color="#1F2723" />
          </Pressable>
        </XStack>

        {/* B) Hero Section */}
        <YStack alignItems="center" gap={4} paddingTop={24} paddingBottom={20}>
          <Text
            fontSize={28}
            fontWeight="700"
            lineHeight={34}
            letterSpacing={-0.3}
            color="#1F2723"
          >
            臨時需要預約？
          </Text>
          <Text
            fontSize={15}
            lineHeight={20}
            color="#808868"
          >
            馬上找到有空又符合你需求的設計師
          </Text>
        </YStack>

        {/* C) Request Card */}
        <YStack paddingHorizontal={16} paddingBottom={28}>
          <YStack
            borderRadius={8}
            backgroundColor="#F0EDE5"
            minHeight={280}
            overflow="hidden"
            position="relative"
          >
            {/* Gradient overlay */}
            <View position="absolute" top={0} left={0} right={0} bottom={0} zIndex={1}>
              <LinearGradient
                colors={['transparent', 'rgba(190,72,128,0.6)', 'rgba(220,100,100,0.4)']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />
            </View>

            {/* Card content */}
            <YStack
              zIndex={2}
              padding={20}
              flex={1}
              justifyContent="space-between"
            >
              {/* Top copy */}
              <Text
                fontSize={13}
                color="#1F2723"
                opacity={0.65}
                paddingBottom={12}
              >
                不再一間一間問，設計師來找你！
              </Text>

              {/* Headline */}
              <YStack gap={4} paddingBottom={24}>
                <Text
                  fontSize={24}
                  fontWeight="700"
                  lineHeight={30}
                  color="#1F2723"
                >
                  {'1分鐘填需求・不用等待\n馬上預約'}
                  <Animated.Text style={{ opacity: fadeAnim, color: '#FF5A3C', fontSize: 24, fontWeight: '700', lineHeight: 30 }}>
                    {ROTATING_WORDS[wordIdx]}
                  </Animated.Text>
                </Text>
              </YStack>

              {/* CTA button */}
              <Pressable
                onPress={() => router.push('/book/category')}
                style={{
                  borderRadius: 9999,
                  height: 44,
                  paddingHorizontal: 20,
                  backgroundColor: '#1F2723',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  alignSelf: 'flex-start',
                }}
              >
                <Text
                  fontSize={16}
                  fontWeight="600"
                  color="#FBFBF8"
                  marginRight={4}
                >
                  填寫需求
                </Text>
                <ChevronRight size={18} color="#FBFBF8" />
              </Pressable>
            </YStack>
          </YStack>
        </YStack>

        {/* D) "現在有空" Section */}
        <YStack paddingBottom={28}>
          {/* Section header */}
          <XStack
            paddingHorizontal={16}
            justifyContent="space-between"
            alignItems="center"
            paddingBottom={12}
          >
            <Text fontSize={16} fontWeight="700" color="#1F2723">
              現在有空
            </Text>
            <Pressable
              onPress={() => Alert.alert('選擇地區', '地區選擇功能即將推出')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
            >
              <Text fontSize={13} color="#1F2723">
                台北・大安
              </Text>
              <ChevronDown size={16} color="#1F2723" />
            </Pressable>
          </XStack>

          {/* Horizontal scroll of category cards */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10.5 }}
          >
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.key}
                onPress={() => handleCategoryPress(cat.key)}
              >
                <YStack
                  width={116}
                  borderRadius={8}
                  backgroundColor="#EAEAE4"
                  overflow="hidden"
                >
                  <Image
                    source={cat.image}
                    style={{ width: 116, height: 80 }}
                    contentFit="cover"
                  />
                  <XStack
                    height={32}
                    alignItems="center"
                    paddingHorizontal={8}
                    gap={4}
                  >
                    <View
                      width={6}
                      height={6}
                      borderRadius={3}
                      backgroundColor="#2E7D52"
                    />
                    <Text fontSize={11} color="#1F2723" flex={1}>
                      {counts[cat.key]} 位{cat.label}
                    </Text>
                    <ChevronRight size={12} color="#1F2723" />
                  </XStack>
                </YStack>
              </Pressable>
            ))}
          </ScrollView>
        </YStack>

        {/* E) Model Opportunity Banner */}
        <YStack paddingHorizontal={16} paddingBottom={20}>
          {/* Section header */}
          <XStack alignItems="center" gap={6} paddingBottom={12}>
            <Text fontSize={16} fontWeight="700" color="#1F2723">
              模特機會
            </Text>
            <View
              backgroundColor="#FEECFB"
              borderRadius={5}
              height={16}
              paddingHorizontal={5}
              justifyContent="center"
            >
              <Text fontSize={10} fontWeight="600" color="#BA4C8B">
                New
              </Text>
            </View>
          </XStack>

          {/* Banner card */}
          <Pressable onPress={handleModelBannerPress}>
            <YStack
              borderRadius={8}
              backgroundColor="#BA4C8B"
              height={166}
              overflow="hidden"
              position="relative"
            >
              {/* Right image */}
              <View
                position="absolute"
                right={0}
                top={0}
                width={125}
                height={166}
                zIndex={1}
              >
                <Image
                  source={require('@/assets/images/home/model-brushes.png')}
                  style={{ width: 125, height: 166 }}
                  contentFit="cover"
                />
              </View>

              {/* Left content */}
              <YStack
                maxWidth="62%"
                paddingTop={20}
                paddingLeft={20}
                paddingBottom={16}
                zIndex={2}
                justifyContent="space-between"
                flex={1}
              >
                <YStack gap={4}>
                  <Text
                    fontSize={13}
                    color="rgba(255,255,255,0.85)"
                  >
                    不介意當練習模特？
                  </Text>
                  <Text
                    fontSize={20}
                    fontWeight="700"
                    color="white"
                  >
                    變美不用花大錢！
                  </Text>
                  <Text
                    fontSize={12}
                    color="rgba(255,255,255,0.80)"
                  >
                    享練習價甚至免費！
                  </Text>
                </YStack>

                {/* CTA */}
                <XStack
                  borderRadius={9999}
                  height={40}
                  paddingHorizontal={16}
                  backgroundColor="#FBFBF8"
                  alignItems="center"
                  justifyContent="center"
                  alignSelf="flex-start"
                  marginTop={12}
                  gap={2}
                >
                  <Text fontSize={14} fontWeight="600" color="#1F2723">
                    尋找模特機會
                  </Text>
                  <ChevronRight size={16} color="#1F2723" />
                </XStack>
              </YStack>
            </YStack>
          </Pressable>
        </YStack>
      </YStack>
    </ScrollView>
  )
}
