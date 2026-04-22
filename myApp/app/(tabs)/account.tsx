// app/(tabs)/account.tsx
import { useState } from 'react'
import { Alert, ScrollView, View } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { FontAwesome6 } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import type { LayoutChangeEvent } from 'react-native'

import { useSession } from '@/lib/auth-context'
import { useRole } from '@/lib/role-context'
import { ProfileHeader } from '@/components/account/ProfileHeader'
import { RoleToggle, TOGGLE_HEIGHT } from '@/components/account/RoleToggle'
import { SettingsRow } from '@/components/account/SettingsRow'

const SECTION_GAP = 24

export default function AccountScreen() {
  const router = useRouter()
  const { session, signOut } = useSession()
  const { enabledRoles, activeRole } = useRole()
  const [headerHeight, setHeaderHeight] = useState(0)

  const showToggle = enabledRoles.length >= 2

  const user = session?.user
  const displayName =
    user?.user_metadata?.full_name ?? user?.email ?? user?.phone ?? '使用者'
  const avatarInitial = (displayName[0] ?? 'V').toUpperCase()
  const roleLabel = activeRole === 'pro' ? '設計師' : '顧客'

  function handleLayout(event: LayoutChangeEvent) {
    setHeaderHeight(event.nativeEvent.layout.height)
  }

  function handleLogout() {
    Alert.alert('確定登出？', '', [
      { text: '取消', style: 'cancel' },
      { text: '登出', style: 'destructive', onPress: signOut },
    ])
  }

  const scrollTopPadding = showToggle ? TOGGLE_HEIGHT / 2 + 8 : 16

  return (
    <YStack flex={1} backgroundColor="#f5f4ed" position="relative">

      {/* Layer 1: Header */}
      <ProfileHeader
        displayName={displayName}
        roleLabel={roleLabel}
        avatarInitial={avatarInitial}
        toggleHeight={showToggle ? TOGGLE_HEIGHT : 0}
        onLayout={handleLayout}
      />

      {/* Layer 2: Floating role toggle — dual-role users only */}
      {showToggle && headerHeight > 0 && (
        <RoleToggle headerHeight={headerHeight} />
      )}

      {/* Layer 3: Scrollable content */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: scrollTopPadding, paddingBottom: 40 }}
      >
        {/* ── Section: 我的 Vava ── */}
        <YStack marginBottom={SECTION_GAP}>
          <Text
            fontSize={18}
            fontWeight="700"
            color="#1F2723"
            paddingHorizontal={16}
            paddingTop={12}
            paddingBottom={8}
          >
            我的 Vava
          </Text>
          <YStack
            backgroundColor="#FBFBF8"
            borderTopWidth={1}
            borderBottomWidth={1}
            borderColor="#F0EDE5"
          >
            <SettingsRow
              label="預約紀錄"
              iconName="calendar"
              onPress={() => router.navigate('/(tabs)/bookings')}
            />
            <View style={{ height: 1, backgroundColor: '#F0EDE5', marginLeft: 48 }} />
            <SettingsRow
              label="喜愛的設計師"
              iconName="heart"
              onPress={() => router.push('/account/liked-pros')}
            />
          </YStack>
        </YStack>

        {/* ── Section: 設定 ── */}
        <YStack marginBottom={SECTION_GAP}>
          <Text
            fontSize={18}
            fontWeight="700"
            color="#1F2723"
            paddingHorizontal={16}
            paddingTop={12}
            paddingBottom={8}
          >
            設定
          </Text>
          <YStack
            backgroundColor="#FBFBF8"
            borderTopWidth={1}
            borderBottomWidth={1}
            borderColor="#F0EDE5"
          >
            {user?.email && (
              <>
                <XStack paddingHorizontal={16} paddingVertical={10} alignItems="flex-start" gap={12}>
                  <View style={{ width: 20, alignItems: 'center', paddingTop: 2 }}>
                    <FontAwesome6 name="envelope" size={14} color="#808868" />
                  </View>
                  <YStack flex={1}>
                    <Text fontSize={12} color="#808868" marginBottom={2}>電子郵件</Text>
                    <Text fontSize={15} color="#1F2723">{user.email}</Text>
                  </YStack>
                </XStack>
                <View style={{ height: 1, backgroundColor: '#F0EDE5', marginLeft: 48 }} />
              </>
            )}
            {user?.phone && (
              <>
                <XStack paddingHorizontal={16} paddingVertical={10} alignItems="flex-start" gap={12}>
                  <View style={{ width: 20, alignItems: 'center', paddingTop: 2 }}>
                    <FontAwesome6 name="phone" size={14} color="#808868" />
                  </View>
                  <YStack flex={1}>
                    <Text fontSize={12} color="#808868" marginBottom={2}>手機號碼</Text>
                    <Text fontSize={15} color="#1F2723">{user.phone}</Text>
                  </YStack>
                </XStack>
                <View style={{ height: 1, backgroundColor: '#F0EDE5', marginLeft: 48 }} />
              </>
            )}
            <SettingsRow
              label="編輯個人資料"
              iconName="pen"
              onPress={() => router.push('/account/profile')}
            />
          </YStack>
        </YStack>

        {/* ── Section: 支援 ── */}
        <YStack marginBottom={SECTION_GAP}>
          <Text
            fontSize={18}
            fontWeight="700"
            color="#1F2723"
            paddingHorizontal={16}
            paddingTop={12}
            paddingBottom={8}
          >
            支援
          </Text>
          <YStack
            backgroundColor="#FBFBF8"
            borderTopWidth={1}
            borderBottomWidth={1}
            borderColor="#F0EDE5"
          >
            <SettingsRow
              label="幫助中心"
              iconName="circle-question"
              onPress={() => Alert.alert('幫助中心', '即將推出')}
            />
            <View style={{ height: 1, backgroundColor: '#F0EDE5', marginLeft: 48 }} />
            <SettingsRow
              label="聯絡我們"
              iconName="comment"
              onPress={() => Alert.alert('聯絡我們', '即將推出')}
            />
            {!enabledRoles.includes('pro') && (
              <>
                <View style={{ height: 1, backgroundColor: '#F0EDE5', marginLeft: 48 }} />
                <SettingsRow
                  label="成為設計師"
                  iconName="scissors"
                  onPress={() => Alert.alert('成為設計師', '即將推出')}
                />
              </>
            )}
          </YStack>
        </YStack>

        {/* ── Logout ── */}
        <YStack>
          <YStack
            backgroundColor="#FBFBF8"
            borderTopWidth={1}
            borderBottomWidth={1}
            borderColor="#F0EDE5"
          >
            <SettingsRow
              label="登出"
              iconName="right-from-bracket"
              iconColor="#b53333"
              labelColor="#b53333"
              showChevron={false}
              onPress={handleLogout}
            />
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  )
}
