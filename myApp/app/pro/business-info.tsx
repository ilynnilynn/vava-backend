// app/pro/business-info.tsx
import { Alert, ScrollView, TextInput, Pressable, StyleSheet, View } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { FA6ProIcon } from '@/components/FA6ProIcon'
import { useState } from 'react'

const WEEKDAYS = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'] as const
type Weekday = typeof WEEKDAYS[number]
type DayStatus = { open: boolean; hours: string }

const DEFAULT_SCHEDULE: Record<Weekday, DayStatus> = {
  '週一': { open: true,  hours: '11:00 – 20:00' },
  '週二': { open: true,  hours: '11:00 – 20:00' },
  '週三': { open: true,  hours: '11:00 – 20:00' },
  '週四': { open: true,  hours: '11:00 – 20:00' },
  '週五': { open: true,  hours: '11:00 – 20:00' },
  '週六': { open: true,  hours: '11:00 – 20:00' },
  '週日': { open: false, hours: '11:00 – 20:00' },
}

export default function BusinessInfoScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [address, setAddress] = useState('台北市大安區忠孝東路四段')
  const [schedule, setSchedule] = useState<Record<Weekday, DayStatus>>(DEFAULT_SCHEDULE)

  function toggleDay(day: Weekday) {
    const current = schedule[day]
    Alert.alert(day, undefined, [
      { text: '開放', onPress: () => setSchedule(prev => ({ ...prev, [day]: { ...current, open: true } })) },
      { text: '休息', onPress: () => setSchedule(prev => ({ ...prev, [day]: { ...current, open: false } })) },
      { text: '取消', style: 'cancel' as const },
    ])
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
          <FA6ProIcon name="chevron-left" size={16} color="#141413" />
        </Pressable>
        <Text fontSize={18} fontWeight="700" color="#141413" flex={1}>營業基本資料</Text>
        <Pressable
          onPress={() => Alert.alert('已儲存')}
          accessibilityLabel="儲存"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Text fontSize={15} fontWeight="600" color="#c96442">儲存</Text>
        </Pressable>
      </XStack>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <Text style={styles.sectionLabel}>營業地址</Text>
        <View style={[styles.card, { paddingHorizontal: 14, paddingVertical: 12 }]}>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="請輸入營業地址"
            placeholderTextColor="#aaa"
            style={{ fontSize: 15, color: '#141413' }}
          />
        </View>

        <Text style={styles.sectionLabel}>營業時間</Text>
        <View style={styles.card}>
          {WEEKDAYS.map((day, i) => {
            const { open, hours } = schedule[day]
            return (
              <View key={day}>
                {i > 0 && <View style={styles.divider} />}
                <Pressable
                  onPress={() => toggleDay(day)}
                  style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text fontSize={15} color="#141413" flex={1}>{day}</Text>
                  <Text fontSize={15} color={open ? '#858279' : '#c96442'} marginRight={6}>
                    {open ? hours : '休息'}
                  </Text>
                  <FA6ProIcon name="chevron-right" size={12} color="#c8c6be" />
                </Pressable>
              </View>
            )
          })}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#e8e6dc',
    marginHorizontal: 14,
  },
})
