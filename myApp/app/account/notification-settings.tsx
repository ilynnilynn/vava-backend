// app/account/notification-settings.tsx — 通知設定 (customer)
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

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const [permStatus, setPermStatus] = useState<PushPermissionStatus | null>(null)
  const [bookingConfirmed, setBookingConfirmed] = useState(true)
  const [bookingChanged, setBookingChanged] = useState(true)
  const [reminder, setReminder] = useState(false)
  const [testSent, setTestSent] = useState(false)
  const [testLoading, setTestLoading] = useState(false)

  useFocusEffect(
    useCallback(() => {
      getPushPermissionStatus().then(setPermStatus)
    }, [])
  )

  async function handleEnablePush() {
    const status = await requestPushPermission()
    if (status === 'denied') {
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

  if (permStatus === null) {
    return (
      <YStack flex={1} backgroundColor="#FBFBF8" justifyContent="center" alignItems="center">
        <ActivityIndicator size="large" color="#1F2723" />
      </YStack>
    )
  }

  return (
    <YStack flex={1} backgroundColor="#FBFBF8">
      <YStack paddingTop={insets.top} paddingBottom={0.5}>
        <XStack height={48} alignItems="center" paddingHorizontal={20}>
          <Pressable
            onPress={() => router.back()}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            accessibilityLabel="返回"
            accessibilityRole="button"
          >
            <AppIcon name="back" size={20} color="#1F2723" />
          </Pressable>
          <Text flex={1} fontSize={16} fontWeight="700" color="#1F2723" textAlign="center">
            通知設定
          </Text>
          <View style={{ width: 44 }} />
        </XStack>
      </YStack>

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
                開啟後，即可收到預約確認、變更及提醒通知
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
              <View style={styles.card}>
                <XStack paddingHorizontal={20} paddingVertical={14} alignItems="center" gap={12}>
                  <YStack flex={1} gap={2}>
                    <Text fontSize={15} color="#1F2723">預約確認</Text>
                    <Text fontSize={12} lineHeight={18} color="#8F9391">設計師接受預約時通知你</Text>
                  </YStack>
                  <Switch
                    value={bookingConfirmed}
                    onValueChange={setBookingConfirmed}
                    trackColor={{ false: '#D2D3D3', true: '#1F2723' }}
                    thumbColor="#fff"
                  />
                </XStack>
                <View style={styles.divider} />
                <XStack paddingHorizontal={20} paddingVertical={14} alignItems="center" gap={12}>
                  <YStack flex={1} gap={2}>
                    <Text fontSize={15} color="#1F2723">更改通知</Text>
                    <Text fontSize={12} lineHeight={18} color="#8F9391">預約被更改或取消時立即通知你</Text>
                  </YStack>
                  <Switch
                    value={bookingChanged}
                    onValueChange={setBookingChanged}
                    trackColor={{ false: '#D2D3D3', true: '#1F2723' }}
                    thumbColor="#fff"
                  />
                </XStack>
                <View style={styles.divider} />
                <XStack paddingHorizontal={20} paddingVertical={14} alignItems="center" gap={12}>
                  <YStack flex={1} gap={2}>
                    <Text fontSize={15} color="#1F2723">服務提醒</Text>
                    <Text fontSize={12} lineHeight={18} color="#8F9391">服務開始前 30 分鐘提醒你</Text>
                  </YStack>
                  <Switch
                    value={reminder}
                    onValueChange={setReminder}
                    trackColor={{ false: '#D2D3D3', true: '#1F2723' }}
                    thumbColor="#fff"
                  />
                </XStack>
              </View>

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
