// app/(pro-tabs)/index.tsx — Pro Home / Dashboard
import { useCallback, useState } from 'react'
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, View, ActivityIndicator } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'

import { AppIcon } from '@/components/AppIcon'
import type { AppIconName } from '@/constants/iconMap'
import { BookingCardPro } from '@/components/pro/BookingCardPro'
import { fetchProBookings } from '@/lib/pro-bookings-api'
import { fetchProDashboard, toggleIsAccepting, fetchEarnings } from '@/lib/pro-dashboard-api'
import { splitProBookings } from '@/lib/pro-helpers'
import type { ProBookingListItem } from '@/types/pro'
import type { ProDashboardData, EarningsSummary } from '@/lib/pro-dashboard-api'

export default function ProHomeScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [dashboard, setDashboard] = useState<ProDashboardData | null>(null)
  const [bookings, setBookings] = useState<ProBookingListItem[]>([])
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [toggling, setToggling] = useState(false)

  const load = useCallback(async () => {
    try {
      const [d, b, e] = await Promise.all([
        fetchProDashboard(),
        fetchProBookings(),
        fetchEarnings(),
      ])
      setDashboard(d)
      setBookings(b)
      setEarnings(e)
    } catch (err) {
      console.warn('[pro-home] load error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      load()
    }, [load])
  )

  async function handleToggleAccepting(value: boolean) {
    if (toggling || !dashboard) return
    setToggling(true)
    // Optimistic
    setDashboard(prev => prev ? { ...prev, isAccepting: value } : prev)
    try {
      await toggleIsAccepting(value)
    } catch (e) {
      // Revert
      setDashboard(prev => prev ? { ...prev, isAccepting: !value } : prev)
      Alert.alert('操作失敗', String((e as Error)?.message ?? e))
    } finally {
      setToggling(false)
    }
  }

  if (loading && !refreshing) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="#FBFBF8">
        <ActivityIndicator size="large" color="#1F2723" />
      </YStack>
    )
  }

  const { today, upcoming } = splitProBookings(bookings)
  const isAccepting = dashboard?.isAccepting ?? false

  // Subscription info
  const subStatus = dashboard?.subscriptionStatus ?? 'free'
  const bookingCount = dashboard?.confirmedBookingCount ?? 0

  return (
    <YStack flex={1} backgroundColor="#FBFBF8">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load() }}
            tintColor="#1F2723"
          />
        }
      >
        {/* Header */}
        <YStack paddingTop={insets.top + 20} paddingHorizontal={20} paddingBottom={16}>
          <Text fontSize={24} fontWeight="700" lineHeight={32} color="#1F2723">
            首頁
          </Text>
        </YStack>

        {/* Accepting Toggle Card */}
        <View style={styles.card}>
          <XStack paddingVertical={16} paddingHorizontal={16} alignItems="center" justifyContent="space-between">
            <YStack flex={1} marginRight={12}>
              <Text fontSize={16} fontWeight="600" color="#1F2723" lineHeight={24}>
                接受預約
              </Text>
              <Text fontSize={13} color="#8F9391" lineHeight={20} marginTop={2}>
                {isAccepting ? '顧客可在搜尋中找到你' : '你目前不會出現在搜尋結果中'}
              </Text>
            </YStack>
            <Switch
              value={isAccepting}
              onValueChange={handleToggleAccepting}
              disabled={toggling}
              trackColor={{ false: '#D2D3D3', true: '#33CC87' }}
              thumbColor="#FFFFFF"
            />
          </XStack>
        </View>

        {/* Subscription Banner */}
        {subStatus === 'free' && (
          <Pressable
            onPress={() => router.push('/pro/subscription')}
            style={({ pressed }) => [styles.card, styles.subBanner, { opacity: pressed ? 0.9 : 1 }]}
          >
            <XStack paddingVertical={12} paddingHorizontal={16} alignItems="center" justifyContent="space-between">
              <YStack flex={1}>
                <Text fontSize={14} fontWeight="600" color="#1F2723" lineHeight={20}>
                  免費試用期
                </Text>
                <Text fontSize={13} color="#8F9391" lineHeight={20} marginTop={2}>
                  已完成 {bookingCount} / 10 筆預約
                </Text>
              </YStack>
              {/* Progress bar */}
              <View style={styles.progressBarOuter}>
                <View style={[styles.progressBarInner, { width: `${Math.min(bookingCount / 10, 1) * 100}%` as any }]} />
              </View>
            </XStack>
          </Pressable>
        )}
        {subStatus === 'read_only' && (
          <Pressable
            onPress={() => router.push('/pro/subscription')}
            style={({ pressed }) => [styles.card, styles.subBannerWarning, { opacity: pressed ? 0.9 : 1 }]}
          >
            <XStack paddingVertical={12} paddingHorizontal={16} alignItems="center">
              <AppIcon name="alarmExclamation" size={18} color="#CC3352" />
              <Text fontSize={14} fontWeight="600" color="#CC3352" lineHeight={20} marginLeft={8}>
                訂閱已到期 — 無法新增時段
              </Text>
            </XStack>
          </Pressable>
        )}

        {/* Today's Bookings */}
        <YStack marginTop={20}>
          <XStack paddingHorizontal={20} marginBottom={8} justifyContent="space-between" alignItems="center">
            <Text fontSize={18} fontWeight="700" color="#1F2723" lineHeight={26}>
              今天的預約
            </Text>
            {today.length > 0 && (
              <View style={styles.countBadge}>
                <Text fontSize={12} fontWeight="600" color="#7D85E7">{today.length}</Text>
              </View>
            )}
          </XStack>

          {today.length === 0 ? (
            <View style={[styles.card, { marginHorizontal: 16 }]}>
              <YStack paddingVertical={24} alignItems="center">
                <Text fontSize={14} color="#A5A8A7" lineHeight={20}>今天沒有預約</Text>
              </YStack>
            </View>
          ) : (
            <View style={[styles.card, { marginHorizontal: 0, borderRadius: 0 }]}>
              {today.map((item, idx) => (
                <View key={item.id}>
                  {idx > 0 && <View style={styles.divider} />}
                  <BookingCardPro booking={item} onActionComplete={load} />
                </View>
              ))}
            </View>
          )}
        </YStack>

        {/* Upcoming Bookings */}
        {upcoming.length > 0 && (
          <YStack marginTop={20}>
            <XStack paddingHorizontal={20} marginBottom={8} justifyContent="space-between" alignItems="center">
              <Text fontSize={18} fontWeight="700" color="#1F2723" lineHeight={26}>
                即將到來
              </Text>
              <Pressable
                onPress={() => router.push('/(pro-tabs)/bookings')}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <Text fontSize={13} fontWeight="500" color="#FF5A3C">查看全部</Text>
              </Pressable>
            </XStack>

            <View style={[styles.card, { marginHorizontal: 0, borderRadius: 0 }]}>
              {upcoming.slice(0, 3).map((item, idx) => (
                <View key={item.id}>
                  {idx > 0 && <View style={styles.divider} />}
                  <BookingCardPro booking={item} onActionComplete={load} />
                </View>
              ))}
            </View>
          </YStack>
        )}

        {/* Earnings Summary */}
        {earnings && (
          <YStack marginTop={20}>
            <Text fontSize={18} fontWeight="700" color="#1F2723" lineHeight={26} paddingHorizontal={20} marginBottom={8}>
              收入概覽
            </Text>
            <View style={[styles.card, { marginHorizontal: 16 }]}>
              <XStack paddingVertical={16} paddingHorizontal={16} justifyContent="space-between">
                <EarningBox label="今日" amount={earnings.today} />
                <EarningBox label="本週" amount={earnings.thisWeek} />
                <EarningBox label="本月" amount={earnings.thisMonth} />
              </XStack>
              {earnings.byService.length > 0 && (
                <YStack paddingHorizontal={16} paddingBottom={16} gap={6}>
                  <View style={styles.divider} />
                  <Text fontSize={13} fontWeight="500" color="#8F9391" lineHeight={20} marginTop={8}>
                    依服務類別
                  </Text>
                  {earnings.byService.map(s => (
                    <XStack key={s.label} justifyContent="space-between" alignItems="center">
                      <Text fontSize={14} color="#4B524F" lineHeight={20}>{s.label}</Text>
                      <Text fontSize={14} fontWeight="600" color="#1F2723" lineHeight={20}>
                        NT${s.amount.toLocaleString()}
                      </Text>
                    </XStack>
                  ))}
                </YStack>
              )}
            </View>
          </YStack>
        )}

        {/* Quick Actions */}
        <YStack marginTop={20} marginBottom={16}>
          <Text fontSize={18} fontWeight="700" color="#1F2723" lineHeight={26} paddingHorizontal={20} marginBottom={8}>
            快速操作
          </Text>
          <XStack paddingHorizontal={16} gap={10}>
            <QuickAction
              label="管理時段"
              iconName="calendarConfirm"
              onPress={() => router.push('/(pro-tabs)/slots')}
            />
            <QuickAction
              label="預約紀錄"
              iconName="list"
              onPress={() => router.push('/(pro-tabs)/bookings')}
            />
            <QuickAction
              label="我的服務"
              iconName="serviceGeneric"
              onPress={() => router.push('/pro/services')}
            />
          </XStack>
        </YStack>
      </ScrollView>
    </YStack>
  )
}

function EarningBox({ label, amount }: { label: string; amount: number }) {
  return (
    <YStack alignItems="center" flex={1}>
      <Text fontSize={13} color="#8F9391" lineHeight={20}>{label}</Text>
      <Text fontSize={20} fontWeight="700" color="#1F2723" lineHeight={28} marginTop={2}>
        {amount > 0 ? `$${amount.toLocaleString()}` : '—'}
      </Text>
    </YStack>
  )
}

function QuickAction({ label, iconName, onPress }: { label: string; iconName: AppIconName; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.quickAction, { opacity: pressed ? 0.8 : 1 }]}
    >
      <AppIcon name={iconName} size={20} color="#4B524F" />
      <Text fontSize={13} fontWeight="500" color="#4B524F" lineHeight={20} marginTop={4}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  subBanner: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E8E9E9',
  },
  subBannerWarning: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#f0d0d0',
    backgroundColor: '#fff5f5',
  },
  progressBarOuter: {
    width: 60,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E8E9E9',
    overflow: 'hidden',
  },
  progressBarInner: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#33CC87',
  },
  countBadge: {
    backgroundColor: 'rgba(168,175,255,0.2)',
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  divider: {
    height: 1,
    backgroundColor: '#E8E9E9',
    marginHorizontal: 16,
  },
  quickAction: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E9E9',
  },
})
