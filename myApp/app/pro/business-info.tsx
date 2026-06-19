// app/pro/business-info.tsx
import { ScrollView, TextInput, Pressable, ActivityIndicator, StyleSheet, View } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { AppIcon } from '@/components/AppIcon'
import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/auth-context'

/** Format hour number (0–24) to HH:00 display string */
function formatHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`
}

/** Parse HH:00 string back to hour number, returns null if invalid */
function parseHour(s: string): number | null {
  const match = s.match(/^(\d{1,2}):00$/)
  if (!match) return null
  const n = Number(match[1])
  if (n < 0 || n > 24) return null
  return n
}

type FormState = {
  studioName: string
  address: string
  workStartHour: string
  workEndHour: string
}

export default function BusinessInfoScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { pro, refreshUser } = useSession()

  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>({
    studioName: pro?.studio_name ?? '',
    address: pro?.studio_address ?? '',
    workStartHour: formatHour(pro?.work_start_hour ?? 10),
    workEndHour: formatHour(pro?.work_end_hour ?? 20),
  })

  const snapshot = useRef<FormState | null>(null)

  function startEditing() {
    snapshot.current = { ...form }
    setError(null)
    setIsEditing(true)
  }

  function handleCancel() {
    if (snapshot.current) setForm(snapshot.current)
    setError(null)
    setIsEditing(false)
  }

  async function handleSave() {
    if (!pro) return

    // Validate hours
    const startH = parseHour(form.workStartHour)
    const endH = parseHour(form.workEndHour)
    if (startH === null || endH === null) {
      setError('營業時間格式須為 HH:00（例如 10:00）')
      return
    }
    if (startH >= endH) {
      setError('結束時間須大於開始時間')
      return
    }
    if (!form.address.trim()) {
      setError('營業地址不能為空')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { error: dbError } = await supabase
        .from('pros')
        .update({
          studio_name: form.studioName.trim() || null,
          studio_address: form.address.trim(),
          work_start_hour: startH,
          work_end_hour: endH,
        })
        .eq('id', pro.id)

      if (dbError) {
        setError(dbError.message)
        setSaving(false)
        return
      }

      await refreshUser()
      snapshot.current = null
      setIsEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗，請檢查網路連線')
    } finally {
      setSaving(false)
    }
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
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
        <Text fontSize={20} fontWeight="700" color="#1F2723" flex={1}>營業基本資料</Text>
        {isEditing ? (
          <Pressable
            onPress={handleCancel}
            disabled={saving}
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
        {/* Studio / shop name */}
        <Text style={styles.sectionLabel}>工作室／店名</Text>
        <View style={[styles.card, { paddingHorizontal: 20, paddingVertical: 14 }]}>
          {isEditing ? (
            <TextInput
              value={form.studioName}
              onChangeText={v => updateField('studioName', v)}
              placeholder="選填"
              placeholderTextColor="#787D7B"
              style={{ fontSize: 15, color: '#1F2723' }}
            />
          ) : (
            <Text fontSize={15} color="#1F2723">{form.studioName || '—'}</Text>
          )}
        </View>

        {/* Address */}
        <Text style={styles.sectionLabel}>營業地址</Text>
        <View style={[styles.card, { paddingHorizontal: 20, paddingVertical: 14 }]}>
          {isEditing ? (
            <TextInput
              value={form.address}
              onChangeText={v => updateField('address', v)}
              placeholder="請輸入營業地址"
              placeholderTextColor="#787D7B"
              style={{ fontSize: 15, color: '#1F2723' }}
            />
          ) : (
            <Text fontSize={15} color="#1F2723">{form.address || '—'}</Text>
          )}
        </View>

        {/* Business hours — synced with work_start_hour / work_end_hour (slot system source of truth) */}
        <Text style={styles.sectionLabel}>營業時間</Text>
        <View style={[styles.card, { paddingHorizontal: 20, paddingVertical: 14 }]}>
          <XStack alignItems="center">
            {isEditing ? (
              <>
                <TextInput
                  value={form.workStartHour}
                  onChangeText={v => updateField('workStartHour', v)}
                  style={[styles.timeCell, styles.timeCellActive]}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  selectTextOnFocus
                />
                <Text fontSize={14} color="#8F9391" marginHorizontal={6}>–</Text>
                <TextInput
                  value={form.workEndHour}
                  onChangeText={v => updateField('workEndHour', v)}
                  style={[styles.timeCell, styles.timeCellActive]}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  selectTextOnFocus
                />
              </>
            ) : (
              <Text fontSize={15} color="#1F2723">
                {form.workStartHour} – {form.workEndHour}
              </Text>
            )}
          </XStack>
        </View>

        {error && (
          <Text fontSize={13} color="#CC3352" marginHorizontal={20} marginTop={12}>
            {error}
          </Text>
        )}

        {isEditing && (
          <Pressable
            onPress={handleSave}
            disabled={saving}
            accessibilityLabel="儲存"
            style={({ pressed }) => [styles.saveBtn, { opacity: saving || pressed ? 0.6 : 1 }]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text fontSize={16} fontWeight="700" color="#fff">儲存</Text>
            )}
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
  timeCell: {
    fontSize: 15,
    color: '#8F9391',
    width: 52,
    textAlign: 'center',
  },
  timeCellActive: {
    color: '#1F2723',
    backgroundColor: '#F6F4EF',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
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
