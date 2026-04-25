// app/pro/notifications.tsx
import { Linking, ScrollView, Switch, Pressable, StyleSheet, View } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { FA6ProIcon } from '@/components/FA6ProIcon'
import { useState } from 'react'

// expo-notifications not installed — mock push state.
// Default false so the "push off" UI is visible in dev.
const MOCK_PUSH_ENABLED = false

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [pushEnabled] = useState(MOCK_PUSH_ENABLED)
  const [newBooking, setNewBooking] = useState(true)
  const [cancellation, setCancellation] = useState(true)
  const [reminder, setReminder] = useState(false)

  return (
    <YStack flex={1} backgroundColor="#FBFBF8">
      <XStack
        paddingTop={insets.top + 16}
        paddingHorizontal={16}
        paddingBottom={12}
        alignItems="center"
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="返回"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, marginRight: 12 })}
        >
          <FA6ProIcon name="chevron-left" size={16} color="#1F2723" />
        </Pressable>
        <Text fontSize={18} fontWeight="700" color="#1F2723" flex={1}>通知設定</Text>
      </XStack>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 40,
        }}
      >
        {!pushEnabled ? (
          <View style={styles.emptyCard}>
            <FA6ProIcon name="bell" size={28} color="#626765" weight="regular" />
            <Text fontSize={16} fontWeight="700" color="#1F2723" marginTop={12} marginBottom={6}>
              推播通知已關閉
            </Text>
            <Text
              fontSize={13}
              color="#626765"
              textAlign="center"
              lineHeight={20}
              marginBottom={16}
            >
              開啟後，即可收到新預約、取消及提醒通知
            </Text>
            <Pressable
              onPress={() => Linking.openSettings()}
              accessibilityLabel="前往開啟通知"
              style={({ pressed }) => [styles.ctaButton, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Text fontSize={14} fontWeight="600" color="#fff">前往開啟通知 →</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <XStack paddingHorizontal={14} paddingVertical={14} alignItems="center">
              <Text fontSize={15} color="#1F2723" flex={1}>新預約</Text>
              <Switch
                value={newBooking}
                onValueChange={setNewBooking}
                trackColor={{ false: '#D2D3D3', true: '#1F2723' }}
                thumbColor="#fff"
              />
            </XStack>
            <View style={styles.divider} />
            <XStack paddingHorizontal={14} paddingVertical={14} alignItems="center">
              <Text fontSize={15} color="#1F2723" flex={1}>取消通知</Text>
              <Switch
                value={cancellation}
                onValueChange={setCancellation}
                trackColor={{ false: '#D2D3D3', true: '#1F2723' }}
                thumbColor="#fff"
              />
            </XStack>
            <View style={styles.divider} />
            <XStack paddingHorizontal={14} paddingVertical={14} alignItems="center">
              <Text fontSize={15} color="#1F2723" flex={1}>服務提醒</Text>
              <Switch
                value={reminder}
                onValueChange={setReminder}
                trackColor={{ false: '#D2D3D3', true: '#1F2723' }}
                thumbColor="#fff"
              />
            </XStack>
          </View>
        )}
      </ScrollView>
    </YStack>
  )
}

const styles = StyleSheet.create({
  emptyCard: {
    backgroundColor: '#F6F4EF',
    borderRadius: 12,
    padding: 28,
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#F6F4EF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: '#E8E9E9',
    marginHorizontal: 14,
  },
  ctaButton: {
    backgroundColor: '#1F2723',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
})
