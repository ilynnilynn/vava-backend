// app/pro/services.tsx
import {
  Alert, FlatList, KeyboardAvoidingView, Modal,
  Platform, Pressable, ScrollView, StyleSheet, TextInput, View,
} from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { FA6ProIcon } from '@/components/FA6ProIcon'
import { useState } from 'react'
import type { ServiceItem } from '@/types/pro'

const DURATION_OPTIONS = [30, 45, 60, 90, 120]

// Mock services — replace with real Supabase fetch later
const MOCK_SERVICES: ServiceItem[] = [
  { id: 's-1', name: '凝膠光療 · 手部', duration_minutes: 90, price: 800 },
  { id: 's-2', name: '法式漸層', duration_minutes: 120, price: 1000 },
  { id: 's-3', name: '捲翹嫁接 · 自然款', duration_minutes: 60, price: 1200 },
]

type Draft = { name: string; duration_minutes: number; price: string }

function blankDraft(): Draft {
  return { name: '', duration_minutes: 60, price: '' }
}

function draftFromService(s: ServiceItem): Draft {
  return { name: s.name, duration_minutes: s.duration_minutes, price: String(s.price) }
}

export default function ServicesScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [services, setServices] = useState<ServiceItem[]>(MOCK_SERVICES)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<ServiceItem | null>(null)
  const [draft, setDraft] = useState<Draft>(blankDraft())

  function openAdd() {
    setEditing(null)
    setDraft(blankDraft())
    setSheetOpen(true)
  }

  function openEdit(service: ServiceItem) {
    setEditing(service)
    setDraft(draftFromService(service))
    setSheetOpen(true)
  }

  function closeSheet() {
    setSheetOpen(false)
  }

  function handleSave() {
    const price = parseInt(draft.price, 10)
    if (!draft.name.trim() || isNaN(price) || price <= 0) {
      Alert.alert('請填寫完整資訊')
      return
    }
    const updated = { name: draft.name.trim(), duration_minutes: draft.duration_minutes, price }
    if (editing) {
      setServices(prev => prev.map(s => s.id === editing.id ? { ...s, ...updated } : s))
    } else {
      setServices(prev => [...prev, { id: `s-${Date.now()}`, ...updated }])
    }
    setSheetOpen(false)
  }

  function handleDelete() {
    if (!editing) return
    Alert.alert(`刪除「${editing.name}」？`, '此操作無法復原', [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: () => {
          setServices(prev => prev.filter(s => s.id !== editing.id))
          setSheetOpen(false)
        },
      },
    ])
  }

  function pickDuration() {
    Alert.alert('服務時長', undefined, [
      ...DURATION_OPTIONS.map(d => ({
        text: `${d} 分鐘`,
        onPress: () => setDraft(prev => ({ ...prev, duration_minutes: d })),
      })),
      { text: '取消', style: 'cancel' as const },
    ])
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
          <FA6ProIcon name="chevron-left" size={16} color="#1F2723" />
        </Pressable>
        <Text fontSize={18} fontWeight="700" color="#1F2723" flex={1}>服務項目</Text>
        <Pressable
          onPress={openAdd}
          accessibilityLabel="新增服務"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <FA6ProIcon name="plus" size={16} color="#1F2723" />
        </Pressable>
      </XStack>

      {/* Services list */}
      <FlatList
        data={services}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        renderItem={({ item }) => (
          <XStack paddingVertical={14} paddingHorizontal={16} justifyContent="space-between" alignItems="center">
            <YStack flex={1} gap={3}>
              <Text fontSize={15} fontWeight="600" color="#1F2723">{item.name}</Text>
              <Text fontSize={13} color="#626765">{item.duration_minutes} 分鐘 · NT${item.price}</Text>
            </YStack>
            <Pressable
              onPress={() => openEdit(item)}
              accessibilityLabel={`編輯 ${item.name}`}
              hitSlop={12}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <FA6ProIcon name="pen" size={14} color="#626765" />
            </Pressable>
          </XStack>
        )}
      />

      {/* Add / Edit sheet */}
      <Modal
        visible={sheetOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeSheet}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: '#FBFBF8' }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Sheet header */}
          <XStack paddingTop={20} paddingHorizontal={16} paddingBottom={12} alignItems="center">
            <Pressable
              onPress={closeSheet}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <Text fontSize={15} color="#626765">取消</Text>
            </Pressable>
            <Text fontSize={18} fontWeight="700" color="#1F2723" flex={1} textAlign="center">
              {editing ? '編輯服務' : '新增服務'}
            </Text>
            {/* Spacer to visually centre the title */}
            <View style={{ width: 36 }} />
          </XStack>

          <ScrollView
            contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.sectionLabel}>服務資訊</Text>
            <View style={styles.card}>
              {/* Name */}
              <XStack paddingHorizontal={14} paddingVertical={12} alignItems="center">
                <Text fontSize={15} color="#626765" width={56}>名稱</Text>
                <TextInput
                  value={draft.name}
                  onChangeText={v => setDraft(prev => ({ ...prev, name: v }))}
                  placeholder="請輸入服務名稱"
                  placeholderTextColor="#787D7B"
                  style={styles.input}
                />
              </XStack>

              <View style={styles.rowDivider} />

              {/* Duration */}
              <Pressable
                onPress={pickDuration}
                style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Text fontSize={15} color="#626765" width={56}>時長</Text>
                <Text fontSize={15} color="#1F2723" flex={1} textAlign="right" marginRight={6}>
                  {draft.duration_minutes} 分鐘
                </Text>
                <FA6ProIcon name="chevron-right" size={12} color="#BBBEBD" />
              </Pressable>

              <View style={styles.rowDivider} />

              {/* Price */}
              <XStack paddingHorizontal={14} paddingVertical={12} alignItems="center">
                <Text fontSize={15} color="#626765" width={56}>價格</Text>
                <XStack flex={1} justifyContent="flex-end" alignItems="center" gap={4}>
                  <Text fontSize={15} color="#626765">NT$</Text>
                  <TextInput
                    value={draft.price}
                    onChangeText={v => setDraft(prev => ({ ...prev, price: v.replace(/[^0-9]/g, '') }))}
                    placeholder="0"
                    placeholderTextColor="#787D7B"
                    keyboardType="number-pad"
                    style={[styles.input, { textAlign: 'right' }]}
                  />
                </XStack>
              </XStack>
            </View>

            <Pressable
              onPress={handleSave}
              accessibilityLabel="儲存"
              style={({ pressed }) => [styles.saveBtn, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text fontSize={16} fontWeight="700" color="#fff">儲存</Text>
            </Pressable>

            {editing && (
              <Pressable
                onPress={handleDelete}
                accessibilityLabel="刪除服務"
                style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Text fontSize={15} fontWeight="600" color="#CC3352">刪除服務</Text>
              </Pressable>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </YStack>
  )
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: '#E8E9E9',
    marginHorizontal: 16,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#E8E9E9',
    marginHorizontal: 14,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1F2723',
    textAlign: 'right',
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
  deleteBtn: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
  },
})
