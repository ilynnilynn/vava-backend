import { useState, useCallback } from 'react'
import { SectionList, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import { YStack, XStack, Text, View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { AppIcon } from '@/components/AppIcon'

import { NotificationCard } from '@/components/notification/NotificationCard'
import { fetchNotifications, markAllAsRead, markAsRead } from '@/lib/notifications-api'
import type { NotificationListItem } from '@/types/notification'

const WEEKDAYS_ZH = ['日', '一', '二', '三', '四', '五', '六']

function getDateLabel(isoString: string): string {
  const d = new Date(isoString)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000)
  const dateStr = `${d.getMonth() + 1}/${d.getDate()} 週${WEEKDAYS_ZH[d.getDay()]}`
  if (diff === 0) return `${dateStr}（今天）`
  if (diff === -1) return `${dateStr}（昨天）`
  return dateStr
}

function groupByDate(items: NotificationListItem[]) {
  const map = new Map<string, NotificationListItem[]>()
  for (const item of items) {
    const d = new Date(item.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return Array.from(map.entries()).map(([, data]) => ({
    title: getDateLabel(data[0].created_at),
    data,
  }))
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const [notifications, setNotifications] = useState<NotificationListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await fetchNotifications()
      setNotifications(data)
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

  async function handlePress(item: NotificationListItem) {
    if (!item.is_read) {
      await markAsRead(item.id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      )
    }
    if (item.booking_id) {
      router.push(`/booking/${item.booking_id}`)
    }
  }

  async function handleMarkAllRead() {
    await markAllAsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  function handleRefresh() {
    setRefreshing(true)
    load()
  }

  // Loading state
  if (loading && !refreshing) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" paddingBottom={80} backgroundColor="#FBFBF8">
        <ActivityIndicator size="large" color="#1F2723" />
      </YStack>
    )
  }

  // Sort newest first
  const sorted = [...notifications].sort(
    (a, b) => b.created_at.localeCompare(a.created_at)
  )
  const sections = groupByDate(sorted)

  return (
    <YStack flex={1} backgroundColor="#FBFBF8">
      {/* Page title */}
      <YStack paddingTop={insets.top + 21} paddingHorizontal={20} paddingBottom={20}>
        <XStack alignItems="center" justifyContent="space-between">
          <XStack alignItems="center" gap={12}>
            <Pressable
              onPress={() => router.back()}
              accessibilityLabel="返回"
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <AppIcon name="back" size={18} color="#1F2723" />
            </Pressable>
            <Text fontSize={24} fontWeight="700" lineHeight={32} color="#1F2723">
              通知
            </Text>
          </XStack>
          <Pressable
            onPress={handleMarkAllRead}
            accessibilityLabel="全部已讀"
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Text fontSize={15} fontWeight="500" color="#626765">全部已讀</Text>
          </Pressable>
        </XStack>
      </YStack>

      {/* Empty state */}
      {notifications.length === 0 ? (
        <YStack flex={1} justifyContent="center" alignItems="center" gap={16} paddingHorizontal={24} paddingBottom={80}>
          <AppIcon name="notification" size={48} color="#E8E9E9" />
          <Text fontSize={16} fontWeight="600" color="#626765" textAlign="center">
            目前沒有通知
          </Text>
        </YStack>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 40,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1F2723" />
          }
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: '#E8E9E9', marginHorizontal: 16 }} />
          )}
          renderSectionHeader={({ section }) => (
            <View style={{ paddingHorizontal: 20, paddingTop: section === sections[0] ? 12 : 20, paddingBottom: 6, backgroundColor: '#FBFBF8' }}>
              <Text fontSize={13} fontWeight="500" color="#A5A8A7">{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <NotificationCard notification={item} onPress={() => handlePress(item)} />
          )}
        />
      )}
    </YStack>
  )
}
