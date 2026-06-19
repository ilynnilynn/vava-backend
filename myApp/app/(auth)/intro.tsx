// app/(auth)/intro.tsx
import { useState, useRef } from 'react'
import { FlatList, Pressable, StyleSheet, View, Dimensions } from 'react-native'
import { Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const SLIDES = [
  { id: '1', headline: '即時預約', sub: '當天空位，立刻搶訂' },
  { id: '2', headline: '精選美業師', sub: '頂尖美甲美睫設計師' },
  { id: '3', headline: '安心付款', sub: '透明定價，無隱藏費用' },
]

async function markIntroSeen() {
  await AsyncStorage.setItem('@vava/introSeen', 'true')
}

export default function IntroScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<FlatList>(null)

  async function handleDone() {
    await markIntroSeen()
    router.replace('/(auth)/login')
  }

  function handleSkip() {
    handleDone()
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      {/* Skip button */}
      <View style={styles.skipRow}>
        <Pressable onPress={handleSkip} accessibilityRole="button" accessibilityLabel="跳過">
          <Text fontSize={15} color="rgba(255,90,60,0.7)">跳過</Text>
        </Pressable>
      </View>

      {/* Slides */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(e) => {
          setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))
        }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
            <Text fontSize={30} fontWeight="700" lineHeight={38} color="#1F2723" textAlign="center">
              {item.headline}
            </Text>
            <Text fontSize={16} lineHeight={24} color="#8F9391" textAlign="center" marginTop={12}>
              {item.sub}
            </Text>
          </View>
        )}
      />

      {/* Dot pagination */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === activeIndex ? '#1F2723' : '#D8D9D2' },
            ]}
          />
        ))}
      </View>

      {/* CTA */}
      <View style={styles.ctaContainer}>
        {activeIndex === SLIDES.length - 1 ? (
          <Pressable
            onPress={handleDone}
            accessibilityRole="button"
            accessibilityLabel="開始"
            style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.75 : 1 }]}
          >
            <Text fontSize={16} fontWeight="600" color="#FBFBF8">開始</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => {
              const next = activeIndex + 1
              listRef.current?.scrollToIndex({ index: next, animated: true })
              setActiveIndex(next)
            }}
            accessibilityRole="button"
            accessibilityLabel="下一頁"
            style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.75 : 1 }]}
          >
            <Text fontSize={16} fontWeight="600" color="#FBFBF8">下一頁</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBFBF8' },
  skipRow: { alignItems: 'flex-end', paddingHorizontal: 24, paddingVertical: 12 },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  ctaContainer: { paddingHorizontal: 24 },
  cta: {
    height: 52,
    backgroundColor: '#FF5A3C',
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
