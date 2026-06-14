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
import { getProRatings, type ProRatingSummary } from '@/lib/ratings-api'

type ProProfile = {
  display_name: string
  ig_handle: string
  ig_verification_status: 'verified' | 'pending_review'
  line_id: string
  bio: string
}

export default function ProProfileScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { session } = useSession()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [profile, setProfile] = useState<ProProfile>({ display_name: '', ig_handle: '', ig_verification_status: 'pending_review', line_id: '', bio: '' })
  const [ratings, setRatings] = useState<ProRatingSummary>({ average: null, count: 0, reviews: [] })
  const snapshot = useRef<ProProfile | null>(null)

  useEffect(() => {
    loadProfile()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadProfile() {
    if (!session) return
    const { data } = await supabase
      .from('pros')
      .select('id, display_name, ig_handle, ig_verification_status, line_id, bio')
      .eq('user_id', session.user.id)
      .single()
    if (data) {
      setProfile({
        display_name: data.display_name ?? '',
        ig_handle: data.ig_handle ?? '',
        ig_verification_status: data.ig_verification_status ?? 'pending_review',
        line_id: data.line_id ?? '',
        bio: data.bio ?? '',
      })
      // Load ratings for this pro
      getProRatings(data.id).then(setRatings).catch(() => {})
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
        line_id: profile.line_id.trim() || null,
        bio: profile.bio.trim() || null,
      })
      .eq('user_id', session.user.id)
    setSaving(false)
    if (error) {
      Alert.alert('儲存失敗', error.message)
    } else {
      setProfile(prev => ({
        ...prev,
        display_name: trimmedName,
        ig_handle: prev.ig_handle.trim().replace(/^@/, ''),
        line_id: prev.line_id.trim(),
        bio: prev.bio.trim(),
      }))
      snapshot.current = null
      setIsEditing(false)
    }
  }

  if (loading) {
    return (
      <YStack flex={1} backgroundColor="#F6F4EF" alignItems="center" justifyContent="center">
        <ActivityIndicator color="#1F2723" />
      </YStack>
    )
  }

  return (
    <YStack flex={1} backgroundColor="#F6F4EF">
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
            <Text fontSize={15} color="#8F9391">取消</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={startEditing}
            style={({ pressed }) => ({ padding: 10, borderRadius: 8, opacity: pressed ? 0.5 : 1 })}
            accessibilityLabel="編輯"
          >
            <AppIcon name="edit" size={18} color="#8F9391" weight="regular" />
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
          <XStack paddingHorizontal={20} paddingVertical={14} alignItems="center">
            <Text fontSize={15} color="#8F9391" width={88}>顯示名稱</Text>
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
          <XStack paddingHorizontal={20} paddingVertical={14} alignItems="center">
            <Text fontSize={15} color="#8F9391" width={88}>Instagram</Text>
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
              <XStack flex={1} alignItems="center" justifyContent="flex-end" gap={6}>
                <Text fontSize={15} color={profile.ig_handle ? '#1F2723' : '#AEADA6'}>
                  {profile.ig_handle ? `@${profile.ig_handle}` : '—'}
                </Text>
                {!!profile.ig_handle && (
                  <View style={profile.ig_verification_status === 'verified' ? styles.verifiedBadge : styles.pendingBadge}>
                    <Text style={profile.ig_verification_status === 'verified' ? styles.verifiedBadgeText : styles.pendingBadgeText}>
                      {profile.ig_verification_status === 'verified' ? '已驗證' : '審核中'}
                    </Text>
                  </View>
                )}
              </XStack>
            )}
          </XStack>
          <View style={styles.divider} />
          {/* LINE ID */}
          <XStack paddingHorizontal={20} paddingVertical={14} alignItems="center">
            <Text fontSize={15} color="#8F9391" width={88}>LINE ID</Text>
            {isEditing ? (
              <TextInput
                value={profile.line_id}
                onChangeText={v => setProfile(p => ({ ...p, line_id: v }))}
                placeholder="你的 LINE ID"
                placeholderTextColor="#AEADA6"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                style={styles.input}
              />
            ) : (
              <Text flex={1} fontSize={15} color={profile.line_id ? '#1F2723' : '#AEADA6'} textAlign="right">
                {profile.line_id || '—'}
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
              padding={20}
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

        {/* Ratings section */}
        {!isEditing && (
          <>
            <Text style={styles.sectionLabel}>評價</Text>
            <View style={styles.card}>
              {ratings.count === 0 ? (
                <Text
                  fontSize={15}
                  color="#AEADA6"
                  padding={20}
                  lineHeight={22}
                >
                  尚無評價
                </Text>
              ) : (
                <>
                  {/* Aggregate */}
                  <XStack paddingHorizontal={20} paddingVertical={16} alignItems="center" gap={12}>
                    <Text fontSize={30} fontWeight="700" lineHeight={38} color="#1F2723">
                      {ratings.average?.toFixed(1) ?? '—'}
                    </Text>
                    <YStack gap={2} flex={1}>
                      <XStack gap={2}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Text
                            key={s}
                            fontSize={16}
                            color={s <= Math.round(ratings.average ?? 0) ? '#E8A838' : '#E8E9E9'}
                          >
                            ★
                          </Text>
                        ))}
                      </XStack>
                      <Text fontSize={13} color="#8F9391">
                        {ratings.count} 則評價
                      </Text>
                    </YStack>
                  </XStack>

                  {/* Recent reviews */}
                  {ratings.reviews.slice(0, 5).map((review, i) => (
                    <View key={review.id}>
                      <View style={styles.divider} />
                      <YStack paddingHorizontal={20} paddingVertical={14} gap={6}>
                        <XStack justifyContent="space-between" alignItems="center">
                          <Text fontSize={14} fontWeight="600" color="#1F2723">
                            {review.rater_name ? maskName(review.rater_name) : '匿名'}
                          </Text>
                          <XStack gap={2}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Text
                                key={s}
                                fontSize={12}
                                color={s <= review.stars ? '#E8A838' : '#E8E9E9'}
                              >
                                ★
                              </Text>
                            ))}
                          </XStack>
                        </XStack>
                        {review.comment && (
                          <Text fontSize={14} lineHeight={20} color="#8F9391">
                            {review.comment}
                          </Text>
                        )}
                        <Text fontSize={12} color="#AEADA6">
                          {formatReviewDate(review.created_at)}
                        </Text>
                      </YStack>
                    </View>
                  ))}
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </YStack>
  )
}

/** Mask customer name for privacy: 小明 → 小* */
function maskName(name: string): string {
  if (name.length <= 1) return name
  return name[0] + '*'.repeat(name.length - 1)
}

/** Format review date: 2026-06-15T10:00:00Z → 2026/06/15 */
function formatReviewDate(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}/${m}/${day}`
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8F9391',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    paddingVertical: 2,
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
    padding: 20,
    minHeight: 100,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: '#E8E9E9',
    marginHorizontal: 14,
  },
  verifiedBadge: {
    backgroundColor: '#E8FAF2',
    borderRadius: 9999,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  verifiedBadgeText: { fontSize: 12, fontWeight: '600', color: '#2DB276' },
  pendingBadge: {
    backgroundColor: '#F3F0EA',
    borderRadius: 9999,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  pendingBadgeText: { fontSize: 12, fontWeight: '500', color: '#8F9391' },
  saveBtn: {
    height: 48,
    backgroundColor: '#1F2723',
    borderRadius: 9999,
    marginHorizontal: 16,
    marginTop: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
