// app/(pro-tabs)/account.tsx
import { Alert, ScrollView, StyleSheet, View } from 'react-native'
import { YStack, Text } from 'tamagui'
import { useRouter } from 'expo-router'

import { useSession } from '@/lib/auth-context'
import { ProfileHeader } from '@/components/account/ProfileHeader'
import { RoleToggle } from '@/components/account/RoleToggle'
import { SettingsRow } from '@/components/account/SettingsRow'

export default function ProAccountScreen() {
  const router = useRouter()
  const { session, signOut } = useSession()
  const user = session?.user
  const displayName =
    user?.user_metadata?.full_name ?? user?.email ?? user?.phone ?? '使用者'

  function handleLogout() {
    Alert.alert('確定登出？', '', [
      { text: '取消', style: 'cancel' },
      { text: '登出', style: 'destructive', onPress: signOut },
    ])
  }

  return (
    <YStack flex={1} backgroundColor="#FBFBF8">
      <ProfileHeader displayName={displayName} />
      <RoleToggle />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* ── 我的服務 ── */}
        <Text style={styles.sectionHeader}>我的服務</Text>
        <YStack>
          <SettingsRow
            label="服務項目管理"
            iconName="scissors"
            onPress={() => router.push('/pro/services')}
          />
        </YStack>

        {/* ── 營業設定 ── */}
        <Text style={styles.sectionHeader}>營業設定</Text>
        <YStack>
          <SettingsRow
            label="預約設定"
            iconName="calendar-check"
            onPress={() => Alert.alert('預約設定', '即將推出')}
          />
          <View style={styles.divider} />
          <SettingsRow
            label="休假設定"
            iconName="umbrella-beach"
            onPress={() => Alert.alert('休假設定', '即將推出')}
          />
        </YStack>

        {/* ── 帳號 ── */}
        <Text style={styles.sectionHeader}>帳號</Text>
        <YStack>
          <SettingsRow
            label="個人資料"
            iconName="user"
            onPress={() => Alert.alert('個人資料', '即將推出')}
          />
          <View style={styles.divider} />
          <SettingsRow
            label="通知設定"
            iconName="bell"
            onPress={() => Alert.alert('通知設定', '即將推出')}
          />
        </YStack>

        {/* ── 支援 ── */}
        <Text style={styles.sectionHeader}>支援</Text>
        <YStack>
          <SettingsRow
            label="幫助中心"
            iconName="circle-question"
            onPress={() => Alert.alert('幫助中心', '即將推出')}
          />
          <View style={styles.divider} />
          <SettingsRow
            label="聯絡我們"
            iconName="comment"
            onPress={() => Alert.alert('聯絡我們', '即將推出')}
          />
        </YStack>

        {/* ── 登出 ── */}
        <YStack marginTop={28}>
          <SettingsRow
            label="登出"
            iconName="right-from-bracket"
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
    color: '#141413',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#e8e6dc',
    marginHorizontal: 16,
  },
})
