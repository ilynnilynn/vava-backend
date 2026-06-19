// components/pro/SlotActionsSheet.tsx
import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Modal, Pressable, StyleSheet, View as RNView } from 'react-native'
import { YStack, XStack, Text, View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppIcon } from '@/components/AppIcon'
import { FA6ProIcon } from '@/components/FA6ProIcon'

type Page = 'menu' | 'hours'

type Props = {
  visible: boolean
  onClose: () => void
  openHourStart: number
  openHourEnd: number
  onOpenAll: () => void
  onCloseAll: () => void
  onSetOpenHours: (start: number, end: number) => void
}

export function SlotActionsSheet({
  visible, onClose,
  openHourStart, openHourEnd,
  onOpenAll, onCloseAll, onSetOpenHours,
}: Props) {
  const insets = useSafeAreaInsets()
  const [page, setPage] = useState<Page>('menu')
  const [startHour, setStartHour] = useState(openHourStart)
  const [endHour, setEndHour] = useState(openHourEnd)
  const slideY = useRef(new Animated.Value(500)).current

  // Sync state + animate sheet in when visible
  useEffect(() => {
    if (visible) {
      setStartHour(openHourStart)
      setEndHour(openHourEnd)
      setPage('menu')
      slideY.setValue(500)
      Animated.timing(slideY, { toValue: 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
    }
  }, [visible, openHourStart, openHourEnd])

  function handleClose() {
    Animated.timing(slideY, { toValue: 500, duration: 200, useNativeDriver: true }).start(() => {
      onClose()
    })
  }

  function handleAction(action: () => void) {
    action()
    handleClose()
  }

  const wrap = (h: number) => ((h % 24) + 24) % 24

  function cycleStart(dir: 1 | -1) {
    setStartHour(prev => {
      const next = wrap(prev + dir)
      return next < endHour ? next : prev // must stay below end
    })
  }

  function cycleEnd(dir: 1 | -1) {
    setEndHour(prev => {
      const next = wrap(prev + dir)
      return next > startHour ? next : prev // must stay above start
    })
  }

  function applyHours() {
    onSetOpenHours(startHour, endHour)
    handleClose()
  }

  const fmt = (h: number) => `${String(h).padStart(2, '0')}:00`

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={handleClose}
    >
      {/* Full-screen backdrop */}
      <Pressable style={[StyleSheet.absoluteFillObject, styles.backdrop]} onPress={handleClose} />

      {/* Spacer pushes sheet to bottom */}
      <RNView style={{ flex: 1 }} pointerEvents="box-none" />

      {/* Sheet content at bottom */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideY }] }]}>
        <YStack>
          {/* Handle bar */}
          <YStack alignItems="center" paddingTop={8} paddingBottom={4}>
            <View width={36} height={4} borderRadius={2} backgroundColor="#E8E9E9" />
          </YStack>

          {/* Header */}
          <XStack height={48} alignItems="center" paddingHorizontal={12}>
            {page === 'hours' ? (
              <View flex={1}>
                <Pressable
                  onPress={() => setPage('menu')}
                  style={styles.closeBtn}
                  accessibilityLabel="返回"
                >
                  <AppIcon name="back" size={20} color="#1F2723" />
                </Pressable>
              </View>
            ) : (
              <View flex={1} />
            )}
            <Text fontSize={16} fontWeight="600" color="#1F2723">
              {page === 'menu' ? '更多操作' : '編輯營業時段'}
            </Text>
            <View flex={1} alignItems="flex-end">
              <Pressable
                onPress={handleClose}
                style={styles.closeBtn}
                accessibilityLabel="關閉"
              >
                <AppIcon name="close" size={20} color="#1F2723" />
              </Pressable>
            </View>
          </XStack>

          {/* ─── Menu page ─── */}
          {page === 'menu' && (
            <>
              <YStack paddingHorizontal={16} paddingBottom={insets.bottom + 16}>
                {/* 編輯營業時段 — navigates to hours sub-page */}
                <Pressable
                  onPress={() => setPage('hours')}
                  accessibilityRole="button"
                  accessibilityLabel="編輯營業時段"
                  style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <View style={styles.actionIcon}>
                    <FA6ProIcon name="clock" size={18} color="#4B524F" />
                  </View>
                  <Text fontSize={15} lineHeight={22} color="#4B524F" flex={1}>編輯營業時段</Text>
                  <AppIcon name="forward" size={14} color="#A5A8A7" />
                </Pressable>

                <View height={StyleSheet.hairlineWidth} backgroundColor="#E8E9E9" />

                <Pressable
                  onPress={() => handleAction(onOpenAll)}
                  accessibilityRole="button"
                  accessibilityLabel="開放全部時段"
                  style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <View style={styles.actionIcon}>
                    <FA6ProIcon name="rectangle-history-circle-plus" size={18} color="#4B524F" />
                  </View>
                  <Text fontSize={15} lineHeight={22} color="#4B524F">開放全部時段</Text>
                </Pressable>

                <View height={StyleSheet.hairlineWidth} backgroundColor="#E8E9E9" />

                <Pressable
                  onPress={() => handleAction(onCloseAll)}
                  accessibilityRole="button"
                  accessibilityLabel="關閉全部時段"
                  style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <View style={styles.actionIcon}>
                    <FA6ProIcon name="ban" size={18} color="#4B524F" />
                  </View>
                  <Text fontSize={15} lineHeight={22} color="#4B524F">關閉全部時段</Text>
                </Pressable>
              </YStack>
            </>
          )}

          {/* ─── Hours editor page ─── */}
          {page === 'hours' && (
            <YStack paddingHorizontal={16} paddingBottom={insets.bottom + 16}>
              <Text fontSize={14} fontWeight="600" color="#1F2723" marginBottom={12}>營業時段</Text>

              <XStack
                alignItems="center"
                justifyContent="center"
                backgroundColor="#FBFBF8"
                borderWidth={1}
                borderColor="#E8E9E9"
                borderRadius={8}
                paddingVertical={8}
                paddingHorizontal={8}
                gap={8}
              >
                {/* Start hour picker */}
                <XStack alignItems="center" flex={1} justifyContent="center">
                  <Pressable
                    onPress={() => cycleStart(-1)}
                    accessibilityLabel="開始時間提前"
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.arrowBtn, { opacity: pressed ? 0.5 : 1 }]}
                  >
                    <AppIcon name="back" size={14} color="#8F9391" />
                  </Pressable>
                  <View style={styles.timeChip}>
                    <Text fontSize={16} fontWeight="600" color="#1F2723" style={styles.hourText}>
                      {fmt(startHour)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => cycleStart(1)}
                    accessibilityLabel="開始時間延後"
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.arrowBtn, { opacity: pressed ? 0.5 : 1 }]}
                  >
                    <AppIcon name="forward" size={14} color="#8F9391" />
                  </Pressable>
                </XStack>

                <Text fontSize={14} color="#A5A8A7">–</Text>

                {/* End hour picker */}
                <XStack alignItems="center" flex={1} justifyContent="center">
                  <Pressable
                    onPress={() => cycleEnd(-1)}
                    accessibilityLabel="結束時間提前"
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.arrowBtn, { opacity: pressed ? 0.5 : 1 }]}
                  >
                    <AppIcon name="back" size={14} color="#8F9391" />
                  </Pressable>
                  <View style={styles.timeChip}>
                    <Text fontSize={16} fontWeight="600" color="#1F2723" style={styles.hourText}>
                      {fmt(endHour)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => cycleEnd(1)}
                    accessibilityLabel="結束時間延後"
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.arrowBtn, { opacity: pressed ? 0.5 : 1 }]}
                  >
                    <AppIcon name="forward" size={14} color="#8F9391" />
                  </Pressable>
                </XStack>
              </XStack>

              {/* Apply button */}
              <Pressable
                onPress={applyHours}
                accessibilityRole="button"
                accessibilityLabel="套用營業時段"
                style={({ pressed }) => [styles.applyBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Text fontSize={14} fontWeight="600" color="#FBFBF8">套用時段</Text>
              </Pressable>
            </YStack>
          )}
        </YStack>
        </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    backgroundColor: '#FBFBF8',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    overflow: 'hidden',
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 4,
    gap: 12,
  },
  actionIcon: {
    width: 24,
    alignItems: 'center',
  },
  arrowBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  hourText: {
    minWidth: 48,
    textAlign: 'center',
  },
  applyBtn: {
    marginTop: 12,
    backgroundColor: '#1F2723',
    borderRadius: 8,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
