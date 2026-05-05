// app/account/profile.tsx
import { useState } from 'react'
import { Alert, Pressable, TextInput, ActivityIndicator } from 'react-native'
import { YStack, XStack, Text, View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { AppIcon } from '@/components/AppIcon'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/auth-context'

const GENDER_LABELS: Record<string, string> = {
  female: '女性',
  male: '男性',
  other: '其他',
  prefer_not: '不想透露',
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
  const { session, user, refreshUser } = useSession()

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.display_name ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) { Alert.alert('請輸入姓名'); return }
    if (!session) return
    setSaving(true)
    const { error } = await supabase
      .from('users')
      .upsert({ id: session.user.id, display_name: trimmed }, { onConflict: 'id' })
    setSaving(false)
    if (error) {
      Alert.alert('儲存失敗', error.message)
    } else {
      await refreshUser()
      setEditing(false)
    }
  }

  function handleCancel() {
    setName(user?.display_name ?? '')
    setEditing(false)
  }

  const divider = <View height={1} backgroundColor="#F0EDE5" marginLeft={52} />

  return (
    <YStack flex={1} backgroundColor="#FBFBF8">
      {/* Nav bar */}
      <YStack paddingTop={insets.top} backgroundColor="#FBFBF8">
        <XStack height={48} alignItems="center" paddingHorizontal={20}>
          <Pressable
            onPress={editing ? handleCancel : () => router.back()}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            accessibilityLabel={editing ? '取消' : '返回'}
            accessibilityRole="button"
          >
            {editing
              ? <Text fontSize={15} color="#626765">取消</Text>
              : <AppIcon name="back" size={20} color="#1F2723" />
            }
          </Pressable>

          <Text flex={1} fontSize={20} fontWeight="700" color="#1F2723" textAlign="center">
            基本資料
          </Text>

          {editing ? (
            <Pressable
              onPress={saving ? undefined : handleSave}
              disabled={saving}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
              accessibilityLabel="儲存"
              accessibilityRole="button"
            >
              {saving
                ? <ActivityIndicator size="small" color="#1F2723" />
                : <Text fontSize={15} fontWeight="600" color="#1F2723">儲存</Text>
              }
            </Pressable>
          ) : (
            <Pressable
              onPress={() => setEditing(true)}
              style={({ pressed }) => ({ padding: 10, borderRadius: 8, opacity: pressed ? 0.5 : 1 })}
              accessibilityLabel="編輯"
              accessibilityRole="button"
            >
              <AppIcon name="edit" size={18} color="#626765" weight="regular" />
            </Pressable>
          )}
        </XStack>
      </YStack>

      {/* Fields */}
      <YStack
        marginTop={24}
        backgroundColor="#FBFBF8"
        borderTopWidth={1}
        borderBottomWidth={1}
        borderColor="#F0EDE5"
      >
        {/* Display name */}
        <XStack height={52} paddingHorizontal={20} alignItems="center" gap={12}>
          <View width={20} alignItems="center">
            <AppIcon name="user" size={14} color="#626765" />
          </View>
          <YStack flex={1}>
            <Text fontSize={12} color="#626765" marginBottom={2}>姓名</Text>
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
              <Text fontSize={15} color={user?.display_name ? '#1F2723' : '#b0aea5'}>
                {user?.display_name ?? '未設定'}
              </Text>
            )}
          </YStack>
        </XStack>

        {divider}

        {/* Phone */}
        <XStack height={52} paddingHorizontal={20} alignItems="center" gap={12}>
          <View width={20} alignItems="center">
            <AppIcon name="phone" size={14} color="#626765" />
          </View>
          <YStack flex={1}>
            <Text fontSize={12} color="#626765" marginBottom={2}>手機號碼</Text>
            <Text fontSize={15} color={user?.phone ? '#1F2723' : '#b0aea5'}>
              {user?.phone ? formatPhone(user.phone) : '未設定'}
            </Text>
          </YStack>
        </XStack>

        {divider}

        {/* Birthday */}
        <XStack height={52} paddingHorizontal={20} alignItems="center" gap={12}>
          <View width={20} alignItems="center">
            <AppIcon name="calendar" size={14} color="#626765" />
          </View>
          <YStack flex={1}>
            <Text fontSize={12} color="#626765" marginBottom={2}>生日</Text>
            <Text fontSize={15} color={user?.birthday ? '#1F2723' : '#b0aea5'}>
              {user?.birthday ?? '未設定'}
            </Text>
          </YStack>
        </XStack>

        {divider}

        {/* Gender */}
        <XStack height={52} paddingHorizontal={20} alignItems="center" gap={12}>
          <View width={20} alignItems="center">
            <AppIcon name="user" size={14} color="#626765" />
          </View>
          <YStack flex={1}>
            <Text fontSize={12} color="#626765" marginBottom={2}>性別</Text>
            <Text fontSize={15} color={user?.gender ? '#1F2723' : '#b0aea5'}>
              {user?.gender ? (GENDER_LABELS[user.gender] ?? user.gender) : '未設定'}
            </Text>
          </YStack>
        </XStack>

        {/* Email (from auth, read-only) */}
        {session?.user?.email && (
          <>
            {divider}
            <XStack height={52} paddingHorizontal={20} alignItems="center" gap={12}>
              <View width={20} alignItems="center">
                <AppIcon name="email" size={14} color="#626765" />
              </View>
              <YStack flex={1}>
                <Text fontSize={12} color="#626765" marginBottom={2}>電子郵件</Text>
                <Text fontSize={15} color="#1F2723">{session.user.email}</Text>
              </YStack>
            </XStack>
          </>
        )}
      </YStack>
    </YStack>
  )
}
