// app/pro/notifications.tsx
import { useCallback, useState } from 'react'
import { Linking, ScrollView, Switch, Pressable, StyleSheet, View, ActivityIndicator } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { AppIcon } from '@/components/AppIcon'
import {
  getPushPermissionStatus,
  requestPushPermission,
  scheduleTestNotification,
  type PushPermissionStatus,
} from '@/lib/push-notifications'

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const [permStatus, setPermStatus] = useState<PushPermissionStatus | null>(null)
  const [newBooking, setNewBooking] = useState(true)
  const [cancellation, setCancellation] = useState(true)
  const [reminder, setReminder] = useState(false)
  const [testSent, setTestSent] = useState(false)
  const [testLoading, setTestLoading] = useState(false)

  // Refresh permission state every time screen focuses
  useFocusEffect(
    useCallback(() => {
      getPushPermissionStatus().then(setPermStatus)
    }, [])
  )

  async function handleEnablePush() {
    const status = await requestPushPermission()
    if (status === 'denied') {
      // Already denied — must go to Settings
      Linking.openSettings()
    } else {
      setPermStatus(status)
    }
  }

  async function handleTestNotification() {
    setTestLoading(true)
    try {
      await scheduleTestNotification()
      setTestSent(true)
      setTimeout(() => setTestSent(false), 4000)
    } finally {
      setTestLoading(false)
    }
  }

  const pushEnabled = permStatus === 'granted'

  // Show spinner while checking permission on first load
  if (permStatus === null) {
    return (
      <YStack flex={1} backgroundColor="#F6F4EF" justifyContent="center" alignItems="center">
        <ActivityIndicator size="large" color="#1F2723" />
      </YStack>
    )
  }

  return (
    <YStack flex={1} backgroundColor="#F6F4EF">
      <XStack
        paddingTop={insets.top + 16}
        paddingHorizontal={20}
        paddingBottom={12}
        alignItems="center"
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="返回"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, marginRight: 12 })}
        >
          <AppIcon name="back" size={20} color="#1F2723" />
        </Pressable>
        <Text fontSize={20} fontWeight="700" color="#1F2723" flex={1}>通知設定</Text>
      </XStack>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 40,
        }}
      >
        <YStack gap={16}>
          {!pushEnabled ? (
            <View style={styles.emptyCard}>
              <AppIcon name="notification" size={28} color="#8F9391" weight="regular" />
              <Text fontSize={16} fontWeight="700" color="#1F2723" marginTop={12} marginBottom={6}>
                推播通知已關閉
              </Text>
              <Text
                fontSize={13}
                color="#8F9391"
                textAlign="center"
                lineHeight={20}
                marginBottom={16}
              >
                開啟後，即可收到新預約、取消及提醒通知
              </Text>
              <Pressable
                onPress={handleEnablePush}
                accessibilityLabel="開啟通知"
                style={({ pressed }) => [styles.ctaButton, { opacity: pressed ? 0.8 : 1 }]}
              >
                <Text fontSize={14} fontWeight="600" color="#fff">開啟通知</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Toggle rows */}
              <View style={styles.card}>
                <XStack paddingHorizontal={20} paddingVertical={14} alignItems="center" gap={12}>
                  <YStack flex={1} gap={2}>
                    <Text fontSize={15} color="#1F2723">新預約</Text>
                    <Text fontSize={12} lineHeight={18} color="#8F9391">有客人完成預約時通知你</Text>
                  </YStack>
                  <Switch
                    value={newBooking}
                    onValueChange={setNewBooking}
                    trackColor={{ false: '#D2D3D3', true: '#1F2723' }}
                    thumbColor="#fff"
                  />
                </XStack>
                <View style={styles.divider} />
                <XStack paddingHorizontal={20} paddingVertical={14} alignItems="center" gap={12}>
                  <YStack flex={1} gap={2}>
                    <Text fontSize={15} color="#1F2723">更改通知</Text>
                    <Text fontSize={12} lineHeight={18} color="#8F9391">客人更改或取消預約時立即通知你</Text>
                  </YStack>
                  <Switch
                    value={cancellation}
                    onValueChange={setCancellation}
                    trackColor={{ false: '#D2D3D3', true: '#1F2723' }}
                    thumbColor="#fff"
                  />
                </XStack>
                <View style={styles.divider} />
                <XStack paddingHorizontal={20} paddingVertical={14} alignItems="center" gap={12}>
                  <YStack flex={1} gap={2}>
                    <Text fontSize={15} color="#1F2723">服務提醒</Text>
                    <Text fontSize={12} lineHeight={18} color="#8F9391">服務開始前 30 分鐘提醒你準備</Text>
                  </YStack>
                  <Switch
                    value={reminder}
                    onValueChange={setReminder}
                    trackColor={{ false: '#D2D3D3', true: '#1F2723' }}
                    thumbColor="#fff"
                  />
                </XStack>
              </View>

              {/* Test push notification */}
              <Pressable
                onPress={handleTestNotification}
                disabled={testLoading || testSent}
                accessibilityLabel="測試推播通知"
                style={({ pressed }) => [
                  styles.testButton,
                  { opacity: pressed || testLoading || testSent ? 0.7 : 1 },
                ]}
              >
                {testLoading ? (
                  <ActivityIndicator size="small" color="#1F2723" />
                ) : (
                  <XStack alignItems="center" gap={8}>
                    <AppIcon
                      name={testSent ? 'check' : 'notification'}
                      size={16}
                      color="#1F2723"
                      weight={testSent ? 'solid' : 'regular'}
                    />
                    <Text fontSize={14} fontWeight="600" color="#1F2723">
                      {testSent ? '已傳送' : '傳送測試通知'}
                    </Text>
                  </XStack>
                )}
              </Pressable>
            </>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  )
}

const styles = StyleSheet.create({
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 28,
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    paddingVertical: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E8E9E9',
    marginHorizontal: 14,
  },
  ctaButton: {
    backgroundColor: '#1F2723',
    borderRadius: 9999,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  testButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
