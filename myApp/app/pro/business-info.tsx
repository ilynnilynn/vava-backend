// app/pro/business-info.tsx
import { ScrollView, Switch, TextInput, Pressable, StyleSheet, View } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { FA6ProIcon } from '@/components/FA6ProIcon'
import { useRef, useState } from 'react'

type TimeRange = { start: string; end: string }
type DaySchedule = {
  key: string
  label: string
  isOpen: boolean
  ranges: TimeRange[]
}

const INITIAL_SCHEDULE: DaySchedule[] = [
  { key: 'mon', label: '週一', isOpen: true,  ranges: [{ start: '11:00', end: '20:00' }] },
  { key: 'tue', label: '週二', isOpen: true,  ranges: [{ start: '11:00', end: '20:00' }] },
  { key: 'wed', label: '週三', isOpen: true,  ranges: [{ start: '11:00', end: '20:00' }] },
  { key: 'thu', label: '週四', isOpen: true,  ranges: [{ start: '11:00', end: '20:00' }] },
  { key: 'fri', label: '週五', isOpen: true,  ranges: [{ start: '11:00', end: '20:00' }] },
  { key: 'sat', label: '週六', isOpen: true,  ranges: [{ start: '11:00', end: '20:00' }] },
  { key: 'sun', label: '週日', isOpen: false, ranges: [{ start: '11:00', end: '20:00' }] },
]

export default function BusinessInfoScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [address, setAddress] = useState('台北市大安區忠孝東路四段')
  const [schedule, setSchedule] = useState<DaySchedule[]>(INITIAL_SCHEDULE)
  const snapshot = useRef<{ address: string; schedule: DaySchedule[] } | null>(null)

  function startEditing() {
    snapshot.current = { address, schedule: JSON.parse(JSON.stringify(schedule)) }
    setIsEditing(true)
  }

  function handleCancel() {
    if (snapshot.current) {
      setAddress(snapshot.current.address)
      setSchedule(snapshot.current.schedule)
    }
    setIsEditing(false)
  }

  function handleSave() {
    snapshot.current = null
    setIsEditing(false)
  }

  function updateDay(key: string, patch: Partial<DaySchedule>) {
    setSchedule(prev => prev.map(d => (d.key === key ? { ...d, ...patch } : d)))
  }

  function updateRange(key: string, idx: number, field: 'start' | 'end', val: string) {
    setSchedule(prev =>
      prev.map(d => {
        if (d.key !== key) return d
        const ranges = d.ranges.map((r, i) => (i === idx ? { ...r, [field]: val } : r))
        return { ...d, ranges }
      }),
    )
  }

  return (
    <YStack flex={1} backgroundColor="#FBFBF8">
      {/* Header */}
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
          <FA6ProIcon name="chevron-left" size={16} color="#141413" />
        </Pressable>
        <Text fontSize={18} fontWeight="700" color="#141413" flex={1}>營業基本資料</Text>
        {isEditing ? (
          <XStack gap={16} alignItems="center">
            <Pressable
              onPress={handleCancel}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <Text fontSize={15} color="#858279">取消</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <Text fontSize={15} fontWeight="600" color="#c96442">儲存</Text>
            </Pressable>
          </XStack>
        ) : (
          <Pressable
            onPress={startEditing}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Text fontSize={15} fontWeight="600" color="#c96442">編輯</Text>
          </Pressable>
        )}
      </XStack>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Address */}
        <Text style={styles.sectionLabel}>營業地址</Text>
        <View style={[styles.card, { paddingHorizontal: 14, paddingVertical: 12 }]}>
          {isEditing ? (
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="請輸入營業地址"
              placeholderTextColor="#aaa"
              style={{ fontSize: 15, color: '#141413' }}
            />
          ) : (
            <Text fontSize={15} color="#141413">{address || '—'}</Text>
          )}
        </View>

        {/* Business hours */}
        <Text style={styles.sectionLabel}>營業時間</Text>
        <View style={styles.card}>
          {schedule.map((day, i) => (
            <View key={day.key}>
              {i > 0 && <View style={styles.divider} />}
              <XStack paddingHorizontal={14} paddingVertical={13} alignItems="center">
                <Text fontSize={15} color="#141413" width={42}>{day.label}</Text>

                {/* Time display — same position in both modes */}
                <XStack flex={1} alignItems="center">
                  {day.isOpen ? (
                    <>
                      <TextInput
                        value={day.ranges[0]?.start ?? '11:00'}
                        onChangeText={v => updateRange(day.key, 0, 'start', v)}
                        editable={isEditing}
                        style={[styles.timeCell, isEditing && styles.timeCellActive]}
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                        selectTextOnFocus
                      />
                      <Text fontSize={14} color="#858279" marginHorizontal={4}>–</Text>
                      <TextInput
                        value={day.ranges[0]?.end ?? '20:00'}
                        onChangeText={v => updateRange(day.key, 0, 'end', v)}
                        editable={isEditing}
                        style={[styles.timeCell, isEditing && styles.timeCellActive]}
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                        selectTextOnFocus
                      />
                    </>
                  ) : (
                    <Text fontSize={15} color="#c96442">休息</Text>
                  )}
                </XStack>

                {/* Right affordance — Switch in edit, nothing in view */}
                {isEditing && (
                  <Switch
                    value={day.isOpen}
                    onValueChange={v => updateDay(day.key, { isOpen: v })}
                    trackColor={{ false: '#d8d6ce', true: '#c96442' }}
                    thumbColor="#fff"
                  />
                )}
              </XStack>
            </View>
          ))}
        </View>
      </ScrollView>
    </YStack>
  )
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#858279',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: '#F5F5F0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  timeCell: {
    fontSize: 15,
    color: '#858279',
    width: 52,
    textAlign: 'center',
  },
  timeCellActive: {
    color: '#141413',
    backgroundColor: '#E8E6DC',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#e8e6dc',
    marginHorizontal: 14,
  },
})
