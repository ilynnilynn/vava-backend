// app/pro/services.tsx
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { FA6ProIcon } from '@/components/FA6ProIcon'
import type { ServiceItem } from '@/types/pro'

// Mock services — replace with real Supabase fetch later
const MOCK_SERVICES: ServiceItem[] = [
  { id: 's-1', name: '凝膠光療 · 手部', duration_minutes: 90, price: 800 },
  { id: 's-2', name: '法式漸層', duration_minutes: 120, price: 1000 },
  { id: 's-3', name: '捲翹嫁接 · 自然款', duration_minutes: 60, price: 1200 },
]

function ServiceCard({ service }: { service: ServiceItem }) {
  return (
    <XStack
      paddingVertical={14}
      paddingHorizontal={16}
      justifyContent="space-between"
      alignItems="center"
    >
      <YStack flex={1} gap={3}>
        <Text fontSize={15} fontWeight="600" color="#141413">{service.name}</Text>
        <Text fontSize={13} color="#858279">{service.duration_minutes} 分鐘 · NT${service.price}</Text>
      </YStack>
      <Pressable
        onPress={() => Alert.alert('編輯', '即將推出')}
        accessibilityLabel={`編輯 ${service.name}`}
        style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
      >
        <FA6ProIcon name="pen" size={14} color="#858279" />
      </Pressable>
    </XStack>
  )
}

export default function ServicesScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

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
        <Text fontSize={18} fontWeight="700" color="#141413" flex={1}>服務項目</Text>
        <Pressable
          onPress={() => Alert.alert('新增服務', '即將推出')}
          accessibilityLabel="新增服務"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <FA6ProIcon name="plus" size={16} color="#141413" />
        </Pressable>
      </XStack>

      {/* Services list */}
      <FlatList
        data={MOCK_SERVICES}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        ItemSeparatorComponent={() => (
          <View style={styles.divider} />
        )}
        renderItem={({ item }) => <ServiceCard service={item} />}
      />
    </YStack>
  )
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: '#e8e6dc',
    marginHorizontal: 16,
  },
})
