import { useEffect, useRef, useState } from 'react'
import { Animated, Dimensions, View as RNView } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { VavaLogo } from '@/components/vava-logo'
import { useBookingRequest } from '@/lib/booking-context'
import { apiPost } from '@/lib/api'

const DURATION = 6000
const RADAR_SIZE = Math.min(Dimensions.get('window').width * 0.72, 280)
const FALLBACK_COUNT = 8 // shown if API fails

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

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
    let targetCount = FALLBACK_COUNT

    // Fire match API to get real count
    ;(async () => {
      try {
        const dates: string[] = []
        if (state.date === 'now') {
          for (let i = 0; i < 3; i++) {
            const d = new Date()
            d.setDate(d.getDate() + i)
            dates.push(toYMD(d))
          }
        } else if (state.date) {
          const [y, m, d] = state.date.split('-').map(Number)
          for (let i = 0; i < 3; i++) {
            dates.push(toYMD(new Date(y, m - 1, d + i)))
          }
        }

        const body: Record<string, unknown> = { domain: state.category, dates }
        if (state.location) { body.lat = state.location.lat; body.lng = state.location.lng }
        if (state.timeBand && state.timeBand !== 'any') body.timeBand = state.timeBand
        if (state.services?.categoryIds?.length) body.categoryIds = state.services.categoryIds
        if (state.services?.styleId) body.styleId = state.services.styleId

        const res = await apiPost<{ results: unknown[]; total: number }>('/api/bookings/match', body)
        if (!cancelled) targetCount = res.total || res.results.length
      } catch {
        // keep fallback count
      }
    })()

    function scheduleNext() {
      if (cancelled || current >= targetCount) return
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
      setCount(c => c || targetCount)
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
      backgroundColor="#FBFBF8"
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
        <Text fontSize={16} color="#626765">
          正在尋找{categoryLabel}…
        </Text>
        <XStack alignItems="baseline" gap={4}>
          <Text fontSize={16} color="#787D7B">已有</Text>
          <Text fontSize={20} fontWeight="700" lineHeight={28} color="#1F2723">
            {count}
          </Text>
          <Text fontSize={16} color="#787D7B">位符合需求</Text>
        </XStack>
      </YStack>
    </YStack>
  )
}
