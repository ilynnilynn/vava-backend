// app/(tabs)/account.tsx
import { useState, useCallback } from 'react'
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native'
import { YStack } from 'tamagui'
import { useRouter, useFocusEffect } from 'expo-router'

import { useSession } from '@/lib/auth-context'
import { useProfile } from '@/lib/useProfile'
import { ProfileHeader } from '@/components/account/ProfileHeader'
import { hasUnreadNotifications } from '@/lib/notifications-api'
import { RoleToggle } from '@/components/account/RoleToggle'
import { SettingsRow } from '@/components/account/SettingsRow'

export default function AccountScreen() {
  const router = useRouter()
  const { signOut, proStatus, isLoading, refreshUser } = useSession()
  const { displayName, visibleEmail } = useProfile()

  const [hasUnread, setHasUnread] = useState(false)
  useFocusEffect(
    useCallback(() => {
      refreshUser()
      hasUnreadNotifications().then(setHasUnread)
      // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <ProfileHeader displayName={displayName} email={visibleEmail ?? undefined} hasUnread={hasUnread} />
      {!isLoading && proStatus === 'approved' && <RoleToggle />}

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={[styles.card, { marginTop: 24 }]}>
          <SettingsRow
            label="基本資料"
            iconName="user"
            onPress={() => router.push('/account/profile')}
          />
          <View style={styles.divider} />
          <SettingsRow
            label="通知設定"
            iconName="notification"
            onPress={() => router.push('/account/notification-settings')}
          />
          <View style={styles.divider} />
          <SettingsRow
            label="繁體中文"
            iconName="language"
            onPress={() => Linking.openSettings()}
          />
        </View>

        <View style={[styles.card, { marginTop: 24 }]}>
          {!isLoading && proStatus !== 'approved' && (
            <>
              {(proStatus === 'none' || proStatus === 'rejected') && (
                <SettingsRow
                  label="成為設計師"
                  iconName="bookSparkles"
                  onPress={() => router.push('/(onboarding)/become-pro/' as never)}
                />
              )}
              {proStatus === 'pending' && (
                <SettingsRow
                  label="成為設計師"
                  iconName="bookSparkles"
                  showChevron={false}
                  onPress={() => router.push('/(onboarding)/pro/submitted' as never)}
                />
              )}
              <View style={styles.divider} />
            </>
          )}
          <SettingsRow
            label="聯絡我們"
            iconName="email"
            onPress={() => router.push('/account/contact')}
          />
          <View style={styles.divider} />
          <SettingsRow
            label="關於"
            iconName="info"
            onPress={() => router.push('/account/help-center')}
          />
        </View>

        <View style={[styles.card, { marginTop: 24 }]}>
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
