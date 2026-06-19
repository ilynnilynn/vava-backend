import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  View as RNView,
} from 'react-native'
import { Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppIcon } from '@/components/AppIcon'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

type Props = {
  visible: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function FilterBottomSheet({ visible, onClose, title, children }: Props) {
  const insets = useSafeAreaInsets()
  const slideY = useRef(new Animated.Value(SCREEN_HEIGHT)).current
  const backdropOpacity = useRef(new Animated.Value(0)).current
  const [mounted, setMounted] = useState(false)
  const closingRef = useRef(false)

  useEffect(() => {
    if (visible) {
      closingRef.current = false
      setMounted(true)
      slideY.setValue(SCREEN_HEIGHT)
      backdropOpacity.setValue(0)
      Animated.parallel([
        Animated.spring(slideY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 28,
          stiffness: 280,
          mass: 0.8,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start()
    } else if (mounted && !closingRef.current) {
      // Parent set visible=false directly — animate out then unmount
      closingRef.current = true
      Animated.parallel([
        Animated.timing(slideY, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false))
    }
  }, [visible])

  function animateClose() {
    if (closingRef.current) return
    closingRef.current = true
    Animated.parallel([
      Animated.timing(slideY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setMounted(false)
      onClose()
    })
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dy }) => dy > 10,
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0) slideY.setValue(dy)
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > 100 || vy > 0.5) {
          animateClose()
        } else {
          Animated.spring(slideY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 28,
            stiffness: 280,
          }).start()
        }
      },
    })
  ).current

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={animateClose}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={animateClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + 16, transform: [{ translateY: slideY }] },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Handle */}
        <RNView style={styles.handle}>
          <RNView style={styles.handleBar} />
        </RNView>

        {/* Header */}
        <RNView style={styles.header}>
          <Text fontSize={18} fontWeight="700" color="#1F2723" style={{ flex: 1 }}>
            {title}
          </Text>
          <Pressable
            onPress={animateClose}
            accessibilityLabel="關閉"
            accessibilityRole="button"
            style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <AppIcon name="close" size={20} color="#1F2723" />
          </Pressable>
        </RNView>

        {/* Content */}
        {children}
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FBFBF8',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -8 },
    elevation: 16,
  },
  handle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DAD7D0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
