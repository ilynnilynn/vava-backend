// app/pro/subscription.tsx — Subscription / Trial Counter
import { useCallback, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View, ActivityIndicator } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'

import { AppIcon } from '@/components/AppIcon'
import { fetchProDashboard } from '@/lib/pro-dashboard-api'
import type { ProDashboardData } from '@/lib/pro-dashboard-api'

const TRIAL_LIMIT = 10

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [dashboard, setDashboard] = useState<ProDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      fetchProDashboard().then(d => {
        setDashboard(d)
        setLoading(false)
      })
    }, [])
  )

  if (loading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="#FBFBF8">
        <ActivityIndicator size="large" color="#1F2723" />
      </YStack>
    )
  }

  const subStatus = dashboard?.subscriptionStatus ?? 'free'
  const bookingCount = dashboard?.confirmedBookingCount ?? 0
  const progress = Math.min(bookingCount / TRIAL_LIMIT, 1)

  return (
    <YStack flex={1} backgroundColor="#FBFBF8">
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Header */}
        <XStack paddingTop={insets.top + 12} paddingHorizontal={16} paddingBottom={20} alignItems="center">
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => ({ padding: 8, opacity: pressed ? 0.6 : 1 })}
          >
            <AppIcon name="back" size={20} color="#1F2723" />
          </Pressable>
          <Text fontSize={18} fontWeight="700" color="#1F2723" lineHeight={26} marginLeft={8}>
            訂閱方案
          </Text>
        </XStack>

        {/* Status Card */}
        <View style={styles.card}>
          <YStack padding={20} gap={12}>
            <XStack alignItems="center" gap={8}>
              <View style={[styles.statusDot, subStatus === 'active' && styles.statusDotActive, subStatus === 'read_only' && styles.statusDotWarning]} />
              <Text fontSize={16} fontWeight="600" color="#1F2723" lineHeight={24}>
                {subStatus === 'free' && '免費試用中'}
                {subStatus === 'active' && '訂閱啟用中'}
                {subStatus === 'read_only' && '已達上限'}
              </Text>
            </XStack>

            {subStatus === 'free' && (
              <>
                <Text fontSize={14} color="#4B524F" lineHeight={20}>
                  您正在免費試用期間，最多可接受 {TRIAL_LIMIT} 筆預約。
                </Text>

                {/* Progress */}
                <YStack gap={6}>
                  <XStack justifyContent="space-between">
                    <Text fontSize={13} color="#8F9391" lineHeight={20}>已完成預約</Text>
                    <Text fontSize={13} fontWeight="600" color="#1F2723" lineHeight={20}>
                      {bookingCount} / {TRIAL_LIMIT}
                    </Text>
                  </XStack>
                  <View style={styles.progressOuter}>
                    <View style={[styles.progressInner, { width: `${progress * 100}%` as any }]} />
                  </View>
                </YStack>
              </>
            )}

            {subStatus === 'active' && (
              <Text fontSize={14} color="#4B524F" lineHeight={20}>
                您的訂閱已啟用。可無限設定時段並接受預約。
              </Text>
            )}

            {subStatus === 'read_only' && (
              <>
                <Text fontSize={14} color="#CC3352" lineHeight={20}>
                  您已達到免費試用上限。目前無法新增時段，但現有預約和資料仍可查看。
                </Text>
                <Text fontSize={14} color="#4B524F" lineHeight={20}>
                  訂閱後即可繼續接單。
                </Text>
              </>
            )}
          </YStack>
        </View>

        {/* Pricing Card */}
        {(subStatus === 'free' || subStatus === 'read_only') && (
          <View style={[styles.card, { marginTop: 16 }]}>
            <YStack padding={20} gap={12}>
              <Text fontSize={18} fontWeight="700" color="#1F2723" lineHeight={26}>
                VAVA Pro 訂閱
              </Text>
              <XStack alignItems="baseline" gap={4}>
                <Text fontSize={30} fontWeight="700" color="#1F2723" lineHeight={38}>
                  NT$270
                </Text>
                <Text fontSize={14} color="#8F9391" lineHeight={20}>/ 月</Text>
              </XStack>

              <YStack gap={8} marginTop={4}>
                <FeatureRow text="無限時段設定" />
                <FeatureRow text="無限接受預約" />
                <FeatureRow text="收入統計與報表" />
                <FeatureRow text="優先客服支援" />
              </YStack>

              <View style={styles.divider} />

              <Text fontSize={13} color="#A5A8A7" lineHeight={20}>
                付款方式：銀行轉帳或 LINE Pay。訂閱後我們會透過 LINE 與您聯繫付款細節。
              </Text>
            </YStack>
          </View>
        )}

        {/* Help */}
        <View style={[styles.card, { marginTop: 16 }]}>
          <YStack padding={20} gap={8}>
            <Text fontSize={14} fontWeight="600" color="#1F2723" lineHeight={20}>
              有問題嗎？
            </Text>
            <Text fontSize={14} color="#4B524F" lineHeight={20}>
              如有訂閱相關問題，請透過設定頁面的「聯絡我們」與 VAVA 團隊聯繫。
            </Text>
          </YStack>
        </View>
      </ScrollView>
    </YStack>
  )
}

function FeatureRow({ text }: { text: string }) {
  return (
    <XStack alignItems="center" gap={8}>
      <View style={styles.checkCircle}>
        <Text fontSize={10} fontWeight="700" color="#33CC87">✓</Text>
      </View>
      <Text fontSize={14} color="#4B524F" lineHeight={20}>{text}</Text>
    </XStack>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E9E9',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#33CC87',
  },
  statusDotActive: {
    backgroundColor: '#33CC87',
  },
  statusDotWarning: {
    backgroundColor: '#CC3352',
  },
  progressOuter: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E8E9E9',
    overflow: 'hidden',
  },
  progressInner: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#33CC87',
  },
  divider: {
    height: 1,
    backgroundColor: '#E8E9E9',
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(51,204,135,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
