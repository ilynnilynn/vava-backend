// app/(tabs)/account.tsx
import { useState, useCallback } from 'react'
import { Alert, ScrollView, StyleSheet, View } from 'react-native'
import { YStack, Text } from 'tamagui'
import { useRouter, useFocusEffect } from 'expo-router'

import { useSession } from '@/lib/auth-context'
import { ProfileHeader } from '@/components/account/ProfileHeader'
import { hasUnreadNotifications } from '@/lib/notifications-api'
import { RoleToggle } from '@/components/account/RoleToggle'
import { SettingsRow } from '@/components/account/SettingsRow'

function isPrivateRelay(email: string | undefined): boolean {
  return !!email?.endsWith('privaterelay.appleid.com')
}

type AuthUser = NonNullable<ReturnType<typeof useSession>['session']>['user']

function resolveDisplayName(user: AuthUser | null | undefined): string {
  if (!user) return 'Vava User'
  // 1. Profile full_name or name from metadata
  const meta = user.user_metadata ?? {}
  if (meta.full_name && typeof meta.full_name === 'string') return meta.full_name
  if (meta.name && typeof meta.name === 'string') return meta.name
  // 2. Email local part — only if not a private relay and short enough
  const email = user.email
  if (email && !isPrivateRelay(email)) {
    const local = email.split('@')[0]
    if (local.length <= 20) return local
  }
  // 3. Fallback
  return 'Vava User'
}

export default function AccountScreen() {
  const router = useRouter()
  const { session, signOut, proStatus } = useSession()
  const user = session?.user
  const displayName = resolveDisplayName(user)
  // Only show email as secondary if it's not a private relay
  const displayEmail = user?.email && !isPrivateRelay(user.email) ? user.email : undefined

  const [hasUnread, setHasUnread] = useState(false)
  useFocusEffect(
    useCallback(() => {
      hasUnreadNotifications().then(setHasUnread)
    }, [])
  )

  function handleLogout() {
    Alert.alert('確定登出？', '', [
      { text: '取消', style: 'cancel' },
      { text: '登出', style: 'destructive', onPress: signOut },
    ])
  }

  return (
    <YStack flex={1} backgroundColor="#FBFBF8">
      <ProfileHeader displayName={displayName} email={displayEmail} hasUnread={hasUnread} />
      <RoleToggle />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* ── Section: 我的 Vava ── */}
        <Text style={styles.sectionHeader}>我的 Vava</Text>
        <YStack>
          <SettingsRow
            label="預約紀錄"
            iconName="calendar"
            onPress={() => router.navigate('/(tabs)/bookings')}
          />
          <View style={styles.divider} />
          <SettingsRow
            label="喜愛的設計師"
            iconName="favorite"
            onPress={() => router.push('/account/liked-pros')}
          />
        </YStack>

        {/* ── Section: 設定 ── */}
        <Text style={styles.sectionHeader}>設定</Text>
        <YStack>
          <SettingsRow
            label="基本資料"
            iconName="user"
            onPress={() => router.push('/account/profile')}
          />
          <View style={styles.divider} />
          <SettingsRow
            label="通知"
            iconName="notification"
            onPress={() => Alert.alert('通知', '即將推出')}
          />
        </YStack>

        {/* ── Section: 成為設計師 ── */}
        {proStatus === 'none' && (
          <>
            <Text style={styles.sectionHeader}>成為設計師</Text>
            <YStack>
              <SettingsRow
                label="申請成為設計師"
                iconName="user"
                onPress={() => router.push('/(onboarding)/pro/domains' as never)}
              />
            </YStack>
          </>
        )}
        {proStatus === 'pending' && (
          <>
            <Text style={styles.sectionHeader}>設計師申請</Text>
            <YStack>
              <SettingsRow
                label="審核中"
                iconName="time"
                showChevron={false}
                onPress={() => router.push('/(onboarding)/pro/submitted' as never)}
              />
            </YStack>
          </>
        )}

        {/* ── Section: 支援 ── */}
        <Text style={styles.sectionHeader}>支援</Text>
        <YStack>
          <SettingsRow
            label="幫助中心"
            iconName="help"
            onPress={() => Alert.alert('幫助中心', '即將推出')}
          />
          <View style={styles.divider} />
          <SettingsRow
            label="聯絡我們"
            iconName="comment"
            onPress={() => Alert.alert('聯絡我們', '即將推出')}
          />
        </YStack>

        {/* ── Logout ── */}
        <YStack marginTop={28}>
          <SettingsRow
            label="登出"
            iconName="logout"
            iconSize={19}
            showChevron={false}
            onPress={handleLogout}
          />
        </YStack>
      </ScrollView>
    </YStack>
  )
}

const styles = StyleSheet.create({
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2723',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#E8E9E9',
    marginHorizontal: 16,
  },
})
