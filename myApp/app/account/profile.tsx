// app/account/profile.tsx
import { useState } from 'react'
import { Alert, Pressable, TextInput, ActivityIndicator } from 'react-native'
import { YStack, XStack, Text, View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { FA6ProIcon } from '@/components/FA6ProIcon'

import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/auth-context'

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { session } = useSession()

  const user = session?.user
  const initialName = user?.user_metadata?.full_name ?? ''

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) {
      Alert.alert('請輸入姓名')
      return
    }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ data: { full_name: trimmed } })
    setSaving(false)
    if (error) {
      Alert.alert('儲存失敗', error.message)
    } else {
      setEditing(false)
    }
  }

  function handleCancel() {
    setName(initialName)
    setEditing(false)
  }

  return (
    <YStack flex={1} backgroundColor="#f5f4ed">
      {/* Nav bar */}
      <YStack paddingTop={insets.top} backgroundColor="#f5f4ed">
        <XStack height={48} alignItems="center" paddingHorizontal={4}>
          <Pressable
            onPress={editing ? handleCancel : () => router.back()}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            accessibilityLabel={editing ? '取消' : '返回'}
            accessibilityRole="button"
          >
            {editing
              ? <Text fontSize={15} color="#808868">取消</Text>
              : <FA6ProIcon name="chevron-left" size={18} color="#1F2723" />
            }
          </Pressable>

          <Text flex={1} fontSize={16} fontWeight="600" color="#1F2723" textAlign="center">
            基本資料
          </Text>

          <Pressable
            onPress={editing ? handleSave : () => setEditing(true)}
            disabled={saving}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            accessibilityLabel={editing ? '儲存' : '編輯'}
            accessibilityRole="button"
          >
            {saving
              ? <ActivityIndicator size="small" color="#1F2723" />
              : <Text fontSize={15} fontWeight="600" color="#1F2723">
                  {editing ? '儲存' : '編輯'}
                </Text>
            }
          </Pressable>
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
        <XStack
          height={52}
          paddingHorizontal={16}
          alignItems="center"
          gap={12}
        >
          <View width={20} alignItems="center">
            <FA6ProIcon name="user" size={14} color="#808868" />
          </View>
          <YStack flex={1}>
            <Text fontSize={12} color="#808868" marginBottom={2}>姓名</Text>
            {editing ? (
              <TextInput
                value={name}
                onChangeText={setName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSave}
                style={{
                  fontSize: 15,
                  color: '#1F2723',
                  padding: 0,
                  margin: 0,
                }}
              />
            ) : (
              <Text fontSize={15} color={name ? '#1F2723' : '#b0aea5'}>
                {name || '未設定'}
              </Text>
            )}
          </YStack>
        </XStack>

        {/* Divider */}
        {(user?.email || user?.phone) && (
          <View height={1} backgroundColor="#F0EDE5" marginLeft={48} />
        )}

        {/* Email */}
        {user?.email && (
          <>
            <XStack height={52} paddingHorizontal={16} alignItems="center" gap={12}>
              <View width={20} alignItems="center">
                <FA6ProIcon name="envelope" size={14} color="#808868" />
              </View>
              <YStack flex={1}>
                <Text fontSize={12} color="#808868" marginBottom={2}>電子郵件</Text>
                <Text fontSize={15} color="#1F2723">{user.email}</Text>
              </YStack>
            </XStack>
            {user?.phone && (
              <View height={1} backgroundColor="#F0EDE5" marginLeft={48} />
            )}
          </>
        )}

        {/* Phone */}
        {user?.phone && (
          <XStack height={52} paddingHorizontal={16} alignItems="center" gap={12}>
            <View width={20} alignItems="center">
              <FA6ProIcon name="phone" size={14} color="#808868" />
            </View>
            <YStack flex={1}>
              <Text fontSize={12} color="#808868" marginBottom={2}>手機號碼</Text>
              <Text fontSize={15} color="#1F2723">{user.phone}</Text>
            </YStack>
          </XStack>
        )}
      </YStack>
    </YStack>
  )
}
