import { useEffect, useRef, useState } from 'react'
import { Animated, Dimensions, View as RNView } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { VavaLogo } from '@/components/vava-logo'
import { useBookingRequest } from '@/lib/booking-context'

const DURATION = 7000
const RADAR_SIZE = Math.min(Dimensions.get('window').width * 0.72, 280)
const TARGET_COUNT = 23 // TODO: replace with live match count from API

const CATEGORY_LABELS: Record<string, string> = {
  nails: '美甲師',
  lashes: '美睫師',
  makeup: '美妝師',
}

// ── Radar ring ──
function RadarRing({ delay, size }: { delay: number; size: number }) {
  const anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    let loop: Animated.CompositeAnimation
    const timeout = setTimeout(() => {
      loop = Animated.loop(
        Animated.timing(anim, { toValue: 1, duration: 2600, useNativeDriver: true }),
      )
      loop.start()
    }, delay)
    return () => {
      clearTimeout(timeout)
      loop?.stop()
    }
  }, [])

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] })
  const opacity = anim.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0.4, 0] })

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: '#FF5A3C',
        transform: [{ scale }],
        opacity,
      }}
    />
  )
}

// ── Screen ──
export default function SearchingScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { state } = useBookingRequest()

  const categoryLabel = CATEGORY_LABELS[state.category ?? ''] ?? '設計師'
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    let current = 0

    function scheduleNext() {
      if (cancelled || current >= TARGET_COUNT) return
      const delay = Math.random() * 500 + 80
      setTimeout(() => {
        if (cancelled) return
        current += 1
        setCount(current)
        scheduleNext()
      }, delay)
    }
    scheduleNext()

    const timer = setTimeout(() => {
      cancelled = true
      setCount(TARGET_COUNT)
      router.replace('/book/results')
    }, DURATION)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])

  return (
    <YStack
      flex={1}
      backgroundColor="#f5f4ed"
      alignItems="center"
      justifyContent="center"
      gap={44}
      paddingBottom={insets.bottom + 24}
    >
      {/* Radar */}
      <RNView style={{ width: RADAR_SIZE, height: RADAR_SIZE, alignItems: 'center', justifyContent: 'center' }}>
        <RadarRing delay={0}    size={RADAR_SIZE} />
        <RadarRing delay={650}  size={RADAR_SIZE} />
        <RadarRing delay={1300} size={RADAR_SIZE} />
        <RadarRing delay={1950} size={RADAR_SIZE} />
        <VavaLogo size={32} color="#FF5A3C" />
      </RNView>

      {/* Text */}
      <YStack alignItems="center" gap={8}>
        <Text fontSize={16} color="#5e5d59">
          正在尋找{categoryLabel}…
        </Text>
        <XStack alignItems="baseline" gap={4}>
          <Text fontSize={16} color="#87867f">已有</Text>
          <Text fontSize={20} fontWeight="700" lineHeight={28} color="#141413">
            {count}
          </Text>
          <Text fontSize={16} color="#87867f">位符合需求</Text>
        </XStack>
      </YStack>
    </YStack>
  )
}
