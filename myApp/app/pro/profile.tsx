// app/pro/profile.tsx
import { Alert, ScrollView, TextInput, Pressable, StyleSheet, View } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { FA6ProIcon } from '@/components/FA6ProIcon'
import { useRef, useState } from 'react'

type ProfileData = {
  name: string
  bio: string
  phone: string
  instagram: string
  lineId: string
}

const AVATAR_PALETTE = [
  { bg: '#C0E8BA', fg: '#1F2723' },  // mint
  { bg: '#8FD3D1', fg: '#1F2723' },  // teal
  { bg: '#8DC2E6', fg: '#1F2723' },  // sky
  { bg: '#A8AFFF', fg: '#1F2723' },  // periwinkle
  { bg: '#CDB5FF', fg: '#1F2723' },  // lavender
  { bg: '#F98486', fg: '#1F2723' },  // pink
  { bg: '#FD6B59', fg: '#1F2723' },  // coral
  { bg: '#FFA46E', fg: '#1F2723' },  // peach
  { bg: '#DFF5AD', fg: '#1F2723' },  // lime
]

function getAvatarColor(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length]
}

export default function ProProfileScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [profile, setProfile] = useState<ProfileData>({
    name: '林小姐美甲',
    bio: '專業美甲師，10年經驗，擅長凝膠光療與法式設計。',
    phone: '0912-345-678',
    instagram: '@linmei_nails',
    lineId: 'linmei2024',
  })
  const snapshot = useRef<ProfileData | null>(null)

  function startEditing() {
    snapshot.current = { ...profile }
    setIsEditing(true)
  }

  function handleCancel() {
    if (snapshot.current) setProfile(snapshot.current)
    setIsEditing(false)
  }

  function handleSave() {
    snapshot.current = null
    setIsEditing(false)
  }

  function set<K extends keyof ProfileData>(key: K, value: string) {
    setProfile(prev => ({ ...prev, [key]: value }))
  }

  const { bg, fg } = getAvatarColor(profile.name)

  return (
    <YStack flex={1} backgroundColor="#FBFBF8">
      <XStack
        paddingTop={insets.top + 16}
        paddingHorizontal={16}
        paddingBottom={12}
        alignItems="center"
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="返回"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, marginRight: 12 })}
        >
          <FA6ProIcon name="chevron-left" size={16} color="#1F2723" />
        </Pressable>
        <Text fontSize={18} fontWeight="700" color="#1F2723" flex={1}>個人資料</Text>
        {isEditing ? (
          <Pressable onPress={handleCancel} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
            <Text fontSize={15} color="#626765">取消</Text>
          </Pressable>
        ) : (
          <Pressable onPress={startEditing} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
            <Text fontSize={15} fontWeight="600" color="#FF5A3C">編輯</Text>
          </Pressable>
        )}
      </XStack>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Photo row */}
        <Pressable
          onPress={() => Alert.alert('更換大頭照', '即將推出')}
          accessibilityLabel="更換大頭照"
          style={({ pressed }) => [styles.photoRow, { opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={[styles.avatar, { backgroundColor: bg }]}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: fg }}>{profile.name[0] ?? '?'}</Text>
          </View>
          <Text fontSize={14} fontWeight="600" color="#FF5A3C">更換大頭照</Text>
        </Pressable>
        <View style={styles.fullDivider} />

        <Text style={styles.sectionLabel}>基本資訊</Text>
        <View style={styles.card}>
          <XStack paddingHorizontal={14} paddingVertical={12} alignItems="center">
            <Text fontSize={15} color="#626765" width={72}>顯示名稱</Text>
            <TextInput
              value={profile.name}
              onChangeText={v => set('name', v)}
              placeholder="請輸入顯示名稱"
              placeholderTextColor="#787D7B"
              editable={isEditing}
              style={styles.input}
            />
          </XStack>
          <View style={styles.divider} />
          <XStack paddingHorizontal={14} paddingVertical={12} alignItems="flex-start">
            <Text fontSize={15} color="#626765" width={72} paddingTop={2}>簡介</Text>
            <TextInput
              value={profile.bio}
              onChangeText={v => set('bio', v)}
              placeholder="介紹自己和你的服務風格"
              placeholderTextColor="#787D7B"
              multiline
              numberOfLines={3}
              editable={isEditing}
              style={[styles.input, { height: 64, textAlignVertical: 'top' }]}
            />
          </XStack>
        </View>

        <Text style={styles.sectionLabel}>聯絡方式</Text>
        <View style={styles.card}>
          <XStack paddingHorizontal={14} paddingVertical={12} alignItems="center">
            <Text fontSize={15} color="#626765" width={72}>電話</Text>
            <TextInput
              value={profile.phone}
              onChangeText={v => set('phone', v)}
              placeholder="09XX-XXX-XXX"
              placeholderTextColor="#787D7B"
              keyboardType="phone-pad"
              editable={isEditing}
              style={styles.input}
            />
          </XStack>
          <View style={styles.divider} />
          <XStack paddingHorizontal={14} paddingVertical={12} alignItems="center">
            <Text fontSize={15} color="#626765" width={72}>Instagram</Text>
            <TextInput
              value={profile.instagram}
              onChangeText={v => set('instagram', v)}
              placeholder="@yourhandle"
              placeholderTextColor="#787D7B"
              autoCapitalize="none"
              editable={isEditing}
              style={styles.input}
            />
          </XStack>
          <View style={styles.divider} />
          <XStack paddingHorizontal={14} paddingVertical={12} alignItems="center">
            <Text fontSize={15} color="#626765" width={72}>Line ID</Text>
            <TextInput
              value={profile.lineId}
              onChangeText={v => set('lineId', v)}
              placeholder="your_line_id"
              placeholderTextColor="#787D7B"
              autoCapitalize="none"
              editable={isEditing}
              style={styles.input}
            />
          </XStack>
        </View>

        {isEditing && (
          <Pressable
            onPress={handleSave}
            accessibilityLabel="儲存"
            style={({ pressed }) => [styles.saveBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text fontSize={16} fontWeight="700" color="#fff">儲存</Text>
          </Pressable>
        )}
      </ScrollView>
    </YStack>
  )
}

const styles = StyleSheet.create({
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullDivider: {
    height: 1,
    backgroundColor: '#E8E9E9',
  },
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
    marginHorizontal: 16,
    backgroundColor: '#F6F4EF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1F2723',
    textAlign: 'right',
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
    marginHorizontal: 16,
    marginTop: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
