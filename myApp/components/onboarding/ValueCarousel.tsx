// components/onboarding/ValueCarousel.tsx
// Shared swipeable carousel for value/marketing pages.
// Used by both new-user welcome flow and become-a-pro flow.
import { useRef, useState, useCallback, type ReactNode } from 'react'
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from 'react-native'
import { Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppIcon } from '@/components/AppIcon'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

export type ValuePage = {
  id: string
  /** Icon/illustration render function — receives the available width */
  renderIllustration: (width: number) => ReactNode
  headline: string
  body: string
  /** If set, this page shows a primary CTA instead of "next" */
  cta?: { label: string; onPress: () => void }
}

type Props = {
  pages: ValuePage[]
  onSkip: () => void
  accentColor?: string
}

export function ValueCarousel({ pages, onSkip, accentColor = '#FF5A3C' }: Props) {
  const insets = useSafeAreaInsets()
  const flatListRef = useRef<FlatList>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const isLastPage = activeIndex === pages.length - 1
  const currentPage = pages[activeIndex]

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index)
      }
    },
    []
  )

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current

  function goToNext() {
    if (isLastPage) {
      currentPage?.cta?.onPress()
      return
    }
    flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true })
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Skip button */}
      <View style={[styles.skipRow, { paddingTop: 8 }]}>
        <View style={{ flex: 1 }} />
        {!isLastPage ? (
          <Pressable
            onPress={onSkip}
            style={styles.skipBtn}
            accessibilityRole="button"
            accessibilityLabel="略過"
          >
            <AppIcon name="close" size={20} color="#8F9391" weight="regular" />
          </Pressable>
        ) : (
          <View style={styles.skipBtn} />
        )}
      </View>

      {/* Swipeable pages */}
      <FlatList
        ref={flatListRef}
        data={pages}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <View style={[styles.page, { width: SCREEN_WIDTH }]}>
            {/* Illustration area */}
            <View style={styles.illustrationContainer}>
              {item.renderIllustration(SCREEN_WIDTH - 80)}
            </View>

            {/* Text content */}
            <View style={styles.textContainer}>
              <Text
                fontSize={30}
                fontWeight="700"
                lineHeight={38}
                color="#1F2723"
                textAlign="center"
              >
                {item.headline}
              </Text>
              <Text
                fontSize={16}
                lineHeight={24}
                color="#8F9391"
                textAlign="center"
                marginTop={12}
              >
                {item.body}
              </Text>
            </View>
          </View>
        )}
      />

      {/* Bottom: dots + button */}
      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 24 }]}>
        {/* Pagination dots */}
        <View style={styles.dotsRow}>
          {pages.map((page, i) => (
            <View
              key={page.id}
              style={[
                styles.dot,
                {
                  width: i === activeIndex ? 24 : 8,
                  backgroundColor: i === activeIndex ? '#1F2723' : '#D2D3D3',
                },
              ]}
            />
          ))}
        </View>

        {/* CTA / Next button */}
        {isLastPage && currentPage?.cta ? (
          <Pressable
            onPress={currentPage.cta.onPress}
            accessibilityRole="button"
            accessibilityLabel={currentPage.cta.label}
            style={({ pressed }) => [
              styles.ctaBtn,
              { backgroundColor: accentColor, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text fontSize={16} fontWeight="600" color="#FBFBF8">
              {currentPage.cta.label}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={goToNext}
            accessibilityRole="button"
            accessibilityLabel="下一步"
            style={({ pressed }) => [
              styles.ctaBtn,
              { backgroundColor: '#1F2723', opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text fontSize={16} fontWeight="600" color="#FBFBF8">下一步</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBFBF8' },
  skipRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    height: 44,
    alignItems: 'center',
  },
  skipBtn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  page: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxHeight: '50%',
  },
  textContainer: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  ctaBtn: {
    height: 52,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  bottomContainer: {
    paddingHorizontal: 20,
  },
})
