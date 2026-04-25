// app/pro/booking-settings.tsx
import { Alert, ScrollView, Switch, Pressable, StyleSheet, View } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { FA6ProIcon } from '@/components/FA6ProIcon'
import { useRef, useState } from 'react'

type BookingSettings = {
  minAdvanceHours: string
  maxAdvanceDays: string
  bufferMins: string
  autoConfirm: boolean
  cancelDeadline: string
}

const ADVANCE_HOURS_OPTIONS = ['1小時', '2小時', '4小時', '24小時']
const MAX_ADVANCE_OPTIONS = ['7天', '14天', '30天', '60天']
const BUFFER_OPTIONS = ['0分鐘', '15分鐘', '30分鐘', '60分鐘']
const CANCEL_DEADLINE_OPTIONS = ['1小時前', '4小時前', '24小時前', '48小時前']

function PickerRow({ label, value, options, onChange, disabled }: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
  disabled?: boolean
}) {
  function showPicker() {
    Alert.alert(label, undefined, [
      ...options.map(o => ({ text: o, onPress: () => onChange(o) })),
      { text: '取消', style: 'cancel' as const },
    ])
  }
  return (
    <Pressable
      onPress={disabled ? undefined : showPicker}
      style={({ pressed }) => [styles.row, { opacity: !disabled && pressed ? 0.7 : 1 }]}
    >
      <Text fontSize={15} color="#1F2723" flex={1}>{label}</Text>
      <Text fontSize={15} color="#626765" marginRight={6}>{value}</Text>
      {!disabled && <FA6ProIcon name="chevron-right" size={12} color="#BBBEBD" />}
    </Pressable>
  )
}

export default function BookingSettingsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [settings, setSettings] = useState<BookingSettings>({
    minAdvanceHours: '1小時',
    maxAdvanceDays: '30天',
    bufferMins: '15分鐘',
    autoConfirm: true,
    cancelDeadline: '24小時前',
  })
  const snapshot = useRef<BookingSettings | null>(null)

  function startEditing() {
    snapshot.current = { ...settings }
    setIsEditing(true)
  }

  function handleCancel() {
    if (snapshot.current) setSettings(snapshot.current)
    setIsEditing(false)
  }

  function handleSave() {
    snapshot.current = null
    setIsEditing(false)
  }

  function set<K extends keyof BookingSettings>(key: K, value: BookingSettings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

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
        <Text fontSize={18} fontWeight="700" color="#1F2723" flex={1}>預約設定</Text>
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

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <Text style={styles.sectionLabel}>預約規則</Text>
        <View style={styles.card}>
          <PickerRow
            label="最早提前預約"
            value={settings.minAdvanceHours}
            options={ADVANCE_HOURS_OPTIONS}
            onChange={v => set('minAdvanceHours', v)}
            disabled={!isEditing}
          />
          <View style={styles.divider} />
          <PickerRow
            label="最多提前預約"
            value={settings.maxAdvanceDays}
            options={MAX_ADVANCE_OPTIONS}
            onChange={v => set('maxAdvanceDays', v)}
            disabled={!isEditing}
          />
          <View style={styles.divider} />
          <PickerRow
            label="服務間隔時間"
            value={settings.bufferMins}
            options={BUFFER_OPTIONS}
            onChange={v => set('bufferMins', v)}
            disabled={!isEditing}
          />
        </View>

        <Text style={styles.sectionLabel}>確認方式</Text>
        <View style={styles.card}>
          <XStack paddingHorizontal={14} paddingVertical={14} alignItems="center">
            <Text fontSize={15} color="#1F2723" flex={1}>自動確認預約</Text>
            <Switch
              value={settings.autoConfirm}
              onValueChange={v => set('autoConfirm', v)}
              trackColor={{ false: '#D2D3D3', true: '#1F2723' }}
              thumbColor="#fff"
              disabled={!isEditing}
            />
          </XStack>
          <View style={styles.divider} />
          <PickerRow
            label="取消截止時間"
            value={settings.cancelDeadline}
            options={CANCEL_DEADLINE_OPTIONS}
            onChange={v => set('cancelDeadline', v)}
            disabled={!isEditing}
          />
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
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
