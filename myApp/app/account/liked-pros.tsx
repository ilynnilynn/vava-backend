// app/account/liked-pros.tsx
import { useState, useCallback } from 'react'
import { ActivityIndicator, Pressable } from 'react-native'
import { YStack, XStack, Text, View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { FA6ProIcon } from '@/components/FA6ProIcon'

import { fetchLikedPros } from '@/lib/liked-pros-api'
import { LikedProCard } from '@/components/account/LikedProCard'
import { LikedProSheet } from '@/components/account/LikedProSheet'
import type { LikedPro } from '@/types/liked-pros'

export default function LikedProsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const [pros, setPros] = useState<LikedPro[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPro, setSelectedPro] = useState<LikedPro | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchLikedPros()
      setPros(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      load()
    }, [load])
  )

  return (
    <YStack flex={1} backgroundColor="#f5f4ed">
      {/* Nav bar */}
      <YStack paddingTop={insets.top} backgroundColor="#f5f4ed">
        <XStack height={48} alignItems="center" paddingHorizontal={4}>
          <Pressable
            onPress={() => router.back()}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            accessibilityLabel="返回"
            accessibilityRole="button"
          >
            <FA6ProIcon name="chevron-left" size={18} color="#1F2723" />
          </Pressable>
          <Text flex={1} fontSize={16} fontWeight="600" color="#1F2723" textAlign="center">
            喜愛的設計師
          </Text>
          <View width={44} />
        </XStack>
      </YStack>

      {/* Loading */}
      {loading && (
        <YStack flex={1} justifyContent="center" alignItems="center">
          <ActivityIndicator size="large" color="#1F2723" />
        </YStack>
      )}

      {/* Error */}
      {!loading && error && (
        <YStack flex={1} justifyContent="center" alignItems="center" gap={16} paddingHorizontal={24}>
          <Text fontSize={15} color="#858279" textAlign="center">{error}</Text>
          <Pressable
            onPress={() => { setLoading(true); load() }}
            style={{
              borderRadius: 9999,
              height: 40,
              paddingHorizontal: 20,
              backgroundColor: '#1F2723',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text fontSize={14} fontWeight="600" color="#FBFBF8">重試</Text>
          </Pressable>
        </YStack>
      )}

      {/* Empty state */}
      {!loading && !error && pros.length === 0 && (
        <YStack flex={1} justifyContent="center" alignItems="center" gap={12} paddingHorizontal={24}>
          <FA6ProIcon name="heart" size={40} color="#EAEAE4" />
          <Text fontSize={16} fontWeight="600" color="#858279">還沒有喜愛的設計師</Text>
          <Text fontSize={14} color="#858279" textAlign="center">
            在搜尋結果中點擊愛心，即可收藏設計師
          </Text>
        </YStack>
      )}

      {/* List */}
      {!loading && !error && pros.length > 0 && (
        <YStack flex={1} backgroundColor="#FBFBF8" borderTopWidth={1} borderColor="#F0EDE5">
          {pros.map((pro, index) => (
            <YStack key={pro.pro_id}>
              <LikedProCard pro={pro} onBook={() => setSelectedPro(pro)} />
              {index < pros.length - 1 && (
                <View height={1} backgroundColor="#F0EDE5" marginLeft={16} />
              )}
            </YStack>
          ))}
        </YStack>
      )}

      {/* Sheet */}
      <LikedProSheet pro={selectedPro} onClose={() => setSelectedPro(null)} />
    </YStack>
  )
}
