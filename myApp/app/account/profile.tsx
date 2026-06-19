// app/account/profile.tsx
import { useState } from 'react'
import { Alert, Pressable, TextInput, ActivityIndicator, StyleSheet } from 'react-native'
import { YStack, XStack, Text, View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { AppIcon } from '@/components/AppIcon'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/lib/useProfile'

const GENDER_LABELS: Record<string, string> = {
  male: '男性',
  female: '女性',
  other: '其他',
  prefer_not: '不便透露',
}

function formatPhone(raw: string | null | undefined): string {
  if (!raw) return ''
  const d = raw.replace(/\D/g, '')
  if (d.length <= 4) return d
  if (d.length <= 7) return `${d.slice(0, 4)}-${d.slice(4)}`
  return `${d.slice(0, 4)}-${d.slice(4, 7)}-${d.slice(7, 10)}`
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { profile, displayName, visibleEmail, isApplePrivateRelay, userId, refreshProfile } = useProfile()

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile?.display_name ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) { Alert.alert('請輸入姓名'); return }
    if (!userId) return
    setSaving(true)
    const { error } = await supabase
      .from('users')
      .upsert({ id: userId, display_name: trimmed }, { onConflict: 'id' })
    setSaving(false)
    if (error) {
      Alert.alert('儲存失敗', error.message)
    } else {
      await refreshProfile()
      setEditing(false)
    }
  }

  function handleCancel() {
    setName(profile?.display_name ?? '')
    setEditing(false)
  }

  const divider = <View height={1} backgroundColor="#E8E9E9" marginHorizontal={14} />

  return (
    <YStack flex={1} backgroundColor="#FBFBF8">
      {/* Nav bar */}
      <YStack paddingTop={insets.top} paddingBottom={0.5}>
        <XStack height={48} alignItems="center" paddingHorizontal={20}>
          <Pressable
            onPress={editing ? handleCancel : () => router.back()}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            accessibilityLabel={editing ? '取消' : '返回'}
            accessibilityRole="button"
          >
            {editing
              ? <Text fontSize={15} color="#8F9391">取消</Text>
              : <AppIcon name="back" size={20} color="#1F2723" />
            }
          </Pressable>

          <Text flex={1} fontSize={16} fontWeight="700" color="#1F2723" textAlign="center">
            基本資料
          </Text>

          {editing ? (
            <Pressable
              onPress={saving ? undefined : handleSave}
              disabled={saving}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
              accessibilityLabel="完成"
              accessibilityRole="button"
            >
              {saving
                ? <ActivityIndicator size="small" color="#1F2723" />
                : <Text fontSize={15} fontWeight="600" color="#1F2723">完成</Text>
              }
            </Pressable>
          ) : (
            <Pressable
              onPress={() => setEditing(true)}
              style={({ pressed }) => ({ padding: 10, borderRadius: 8, opacity: pressed ? 0.5 : 1 })}
              accessibilityLabel="編輯"
              accessibilityRole="button"
            >
              <AppIcon name="edit" size={18} color="#1F2723" weight="regular" />
            </Pressable>
          )}
        </XStack>
      </YStack>

      {/* Card 1: 姓名, 手機號碼, 生日, 性別 */}
      <View style={styles.card}>
        {/* Display name */}
        <XStack height={56} paddingHorizontal={20} alignItems="center">
          <YStack flex={1}>
            <Text fontSize={12} color="#8F9391" marginBottom={2}>姓名</Text>
            {editing ? (
              <TextInput
                value={name}
                onChangeText={setName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSave}
                style={{ fontSize: 15, color: '#1F2723', padding: 0, margin: 0 }}
              />
            ) : (
              <Text fontSize={15} color={profile?.display_name ? '#1F2723' : '#b0aea5'}>
                {displayName}
              </Text>
            )}
          </YStack>
        </XStack>

        {divider}

        {/* Phone */}
        <XStack height={56} paddingHorizontal={20} alignItems="center">
          <YStack flex={1}>
            <Text fontSize={12} color="#8F9391" marginBottom={2}>手機號碼</Text>
            <Text fontSize={15} color={profile?.phone ? '#1F2723' : '#b0aea5'}>
              {profile?.phone ? formatPhone(profile.phone) : '未設定'}
            </Text>
          </YStack>
        </XStack>

        {divider}

        {/* Birthday */}
        <XStack height={56} paddingHorizontal={20} alignItems="center">
          <YStack flex={1}>
            <Text fontSize={12} color="#8F9391" marginBottom={2}>生日</Text>
            <Text fontSize={15} color={profile?.birthday ? '#1F2723' : '#b0aea5'}>
              {profile?.birthday ?? '未設定'}
            </Text>
          </YStack>
        </XStack>

        {divider}

        {/* Gender */}
        <XStack height={56} paddingHorizontal={20} alignItems="center">
          <YStack flex={1}>
            <Text fontSize={12} color="#8F9391" marginBottom={2}>性別</Text>
            <Text fontSize={15} color={profile?.gender ? '#1F2723' : '#b0aea5'}>
              {profile?.gender ? (GENDER_LABELS[profile.gender] ?? profile.gender) : '未設定'}
            </Text>
          </YStack>
        </XStack>
      </View>

      {/* Card 2: 電子郵件 */}
      {(visibleEmail || isApplePrivateRelay) && (
        <View style={[styles.card, { marginTop: 16 }]}>
          <XStack height={56} paddingHorizontal={20} alignItems="center">
            <YStack flex={1}>
              <Text fontSize={12} color="#8F9391" marginBottom={2}>電子郵件</Text>
              {isApplePrivateRelay ? (
                <Text fontSize={15} color="#8F9391">使用 Apple 登入（已隱藏 Email）</Text>
              ) : (
                <Text fontSize={15} color="#1F2723">{visibleEmail}</Text>
              )}
            </YStack>
          </XStack>
        </View>
      )}
    </YStack>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    paddingVertical: 2,
  },
})
