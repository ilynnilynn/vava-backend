// app/pro/profile.tsx — Pro-only profile info (display name, IG handle)
// Shared personal info (auth name, email, phone) is in /account/profile
import { useEffect, useRef, useState } from 'react'
import { Alert, ScrollView, TextInput, Pressable, ActivityIndicator, StyleSheet, View } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { AppIcon } from '@/components/AppIcon'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/auth-context'

type ProProfile = {
  display_name: string
  ig_handle: string
  bio: string
}

export default function ProProfileScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { session } = useSession()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [profile, setProfile] = useState<ProProfile>({ display_name: '', ig_handle: '', bio: '' })
  const snapshot = useRef<ProProfile | null>(null)

  useEffect(() => {
    loadProfile()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadProfile() {
    if (!session) return
    const { data } = await supabase
      .from('pros')
      .select('display_name, ig_handle, bio')
      .eq('user_id', session.user.id)
      .single()
    if (data) {
      setProfile({
        display_name: data.display_name ?? '',
        ig_handle: data.ig_handle ?? '',
        bio: data.bio ?? '',
      })
    }
    setLoading(false)
  }

  function startEditing() {
    snapshot.current = { ...profile }
    setIsEditing(true)
  }

  function handleCancel() {
    if (snapshot.current) setProfile(snapshot.current)
    setIsEditing(false)
  }

  async function handleSave() {
    if (!session) return
    const trimmedName = profile.display_name.trim()
    if (!trimmedName) {
      Alert.alert('請輸入顯示名稱')
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from('pros')
      .update({
        display_name: trimmedName,
        ig_handle: profile.ig_handle.trim().replace(/^@/, '') || null,
        bio: profile.bio.trim() || null,
      })
      .eq('user_id', session.user.id)
    setSaving(false)
    if (error) {
      Alert.alert('儲存失敗', error.message)
    } else {
      setProfile(prev => ({
        display_name: trimmedName,
        ig_handle: prev.ig_handle.trim().replace(/^@/, ''),
        bio: prev.bio.trim(),
      }))
      snapshot.current = null
      setIsEditing(false)
    }
  }

  if (loading) {
    return (
      <YStack flex={1} backgroundColor="#FBFBF8" alignItems="center" justifyContent="center">
        <ActivityIndicator color="#1F2723" />
      </YStack>
    )
  }

  return (
    <YStack flex={1} backgroundColor="#FBFBF8">
      {/* Header */}
      <XStack
        paddingTop={insets.top + 16}
        paddingHorizontal={20}
        paddingBottom={12}
        alignItems="center"
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="返回"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, marginRight: 12 })}
        >
          <AppIcon name="back" size={20} color="#1F2723" />
        </Pressable>
        <Text fontSize={20} fontWeight="700" color="#1F2723" flex={1}>個人簡介</Text>
        {isEditing ? (
          <Pressable
            onPress={handleCancel}
            style={({ pressed }) => ({ padding: 10, opacity: pressed ? 0.5 : 1 })}
          >
            <Text fontSize={15} color="#626765">取消</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={startEditing}
            style={({ pressed }) => ({ padding: 10, borderRadius: 8, opacity: pressed ? 0.5 : 1 })}
            accessibilityLabel="編輯"
          >
            <AppIcon name="edit" size={18} color="#626765" weight="regular" />
          </Pressable>
        )}
      </XStack>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionLabel}>公開資料</Text>
        <View style={styles.card}>
          {/* Display name */}
          <XStack paddingHorizontal={14} paddingVertical={14} alignItems="center">
            <Text fontSize={15} color="#626765" width={88}>顯示名稱</Text>
            {isEditing ? (
              <TextInput
                value={profile.display_name}
                onChangeText={v => setProfile(p => ({ ...p, display_name: v }))}
                placeholder="請輸入顯示名稱"
                placeholderTextColor="#AEADA6"
                returnKeyType="done"
                style={styles.input}
              />
            ) : (
              <Text flex={1} fontSize={15} color="#1F2723" textAlign="right">
                {profile.display_name || '—'}
              </Text>
            )}
          </XStack>
          <View style={styles.divider} />
          {/* Instagram */}
          <XStack paddingHorizontal={14} paddingVertical={14} alignItems="center">
            <Text fontSize={15} color="#626765" width={88}>Instagram</Text>
            {isEditing ? (
              <XStack flex={1} alignItems="center" justifyContent="flex-end">
                <Text fontSize={15} color="#AEADA6">@</Text>
                <TextInput
                  value={profile.ig_handle.replace(/^@/, '')}
                  onChangeText={v => setProfile(p => ({ ...p, ig_handle: v.replace(/^@/, '') }))}
                  placeholder="your_account"
                  placeholderTextColor="#AEADA6"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  style={styles.input}
                />
              </XStack>
            ) : (
              <Text flex={1} fontSize={15} color={profile.ig_handle ? '#1F2723' : '#AEADA6'} textAlign="right">
                {profile.ig_handle ? `@${profile.ig_handle}` : '—'}
              </Text>
            )}
          </XStack>
        </View>

        <Text style={styles.sectionLabel}>自我介紹</Text>
        <View style={styles.card}>
          {isEditing ? (
            <TextInput
              value={profile.bio}
              onChangeText={v => setProfile(p => ({ ...p, bio: v }))}
              placeholder="介紹你的服務風格、專長或理念…"
              placeholderTextColor="#AEADA6"
              multiline
              returnKeyType="default"
              style={styles.bioInput}
            />
          ) : (
            <Text
              fontSize={15}
              color={profile.bio ? '#1F2723' : '#AEADA6'}
              padding={14}
              lineHeight={22}
            >
              {profile.bio || '尚未填寫'}
            </Text>
          )}
        </View>

        {isEditing && (
          <Pressable
            onPress={handleSave}
            disabled={saving}
            accessibilityLabel="儲存"
            style={({ pressed }) => [styles.saveBtn, { opacity: pressed || saving ? 0.75 : 1 }]}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text fontSize={16} fontWeight="700" color="#fff">儲存</Text>
            }
          </Pressable>
        )}
      </ScrollView>
    </YStack>
  )
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#626765',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  card: {
    marginHorizontal: 20,
    backgroundColor: '#F6F4EF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1F2723',
    textAlign: 'right',
    padding: 0,
  },
  bioInput: {
    fontSize: 15,
    color: '#1F2723',
    padding: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: '#E8E9E9',
    marginHorizontal: 14,
  },
  saveBtn: {
    height: 48,
    backgroundColor: '#1F2723',
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
