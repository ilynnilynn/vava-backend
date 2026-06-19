// app/(pro-tabs)/account.tsx
import { useState, useCallback } from 'react'
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native'
import { YStack, Text } from 'tamagui'
import { useRouter, useFocusEffect } from 'expo-router'

import { useSession } from '@/lib/auth-context'
import { useProfile } from '@/lib/useProfile'
import { ProfileHeader } from '@/components/account/ProfileHeader'
import { hasUnreadNotifications } from '@/lib/notifications-api'
import { RoleToggle } from '@/components/account/RoleToggle'
import { SettingsRow } from '@/components/account/SettingsRow'

export default function ProAccountScreen() {
  const router = useRouter()
  const { signOut, proStatus } = useSession()
  const { displayName, visibleEmail } = useProfile()

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
    <YStack flex={1} backgroundColor="#F6F4EF">
      <ProfileHeader displayName={displayName} email={visibleEmail ?? undefined} hasUnread={hasUnread} />
      {proStatus === 'approved' && <RoleToggle />}

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* ── 我的服務 ── */}
        <Text style={styles.sectionHeader}>我的服務</Text>
        <View style={styles.card}>
          <SettingsRow
            label="服務項目管理"
            iconName="serviceGeneric"
            onPress={() => router.push('/pro/services')}
          />
        </View>

        {/* ── 營業設定 ── */}
        <Text style={styles.sectionHeader}>營業設定</Text>
        <View style={styles.card}>
          <SettingsRow
            label="個人簡介"
            iconName="user"
            onPress={() => router.push('/pro/profile')}
          />
          <View style={styles.divider} />
          <SettingsRow
            label="營業基本資料"
            iconName="store"
            iconSize={19}
            onPress={() => router.push('/pro/business-info')}
          />
          <View style={styles.divider} />
          <SettingsRow
            label="預約設定"
            iconName="calendarConfirm"
            onPress={() => router.push('/pro/booking-settings')}
          />
        </View>

        {/* ── 帳號 ── */}
        <Text style={styles.sectionHeader}>帳號</Text>
        <View style={styles.card}>
          <SettingsRow
            label="基本資料"
            iconName="user"
            onPress={() => router.push('/account/profile')}
          />
          <View style={styles.divider} />
          <SettingsRow
            label="通知設定"
            iconName="notification"
            onPress={() => router.push('/pro/notifications')}
          />
          <View style={styles.divider} />
          <SettingsRow
            label="繁體中文"
            iconName="language"
            onPress={() => Linking.openSettings()}
          />
        </View>

        {/* ── 支援 ── */}
        <Text style={styles.sectionHeader}>支援</Text>
        <View style={styles.card}>
          <SettingsRow
            label="幫助中心"
            iconName="help"
            onPress={() => router.push('/account/help-center')}
          />
          <View style={styles.divider} />
          <SettingsRow
            label="聯絡我們"
            iconName="comment"
            onPress={() => Alert.alert('聯絡我們', '即將推出')}
          />
        </View>

        {/* ── 登出 ── */}
        <View style={[styles.card, { marginTop: 16 }]}>
          <SettingsRow
            label="登出"
            iconName="logout"
            iconSize={19}
            showChevron={false}
            onPress={handleLogout}
          />
        </View>
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
  card: {
    marginHorizontal: 16,
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
})
