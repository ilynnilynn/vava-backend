// components/account/LikedProCard.tsx
import { Pressable } from 'react-native'
import { XStack, YStack, Text, View } from 'tamagui'
import type { LikedPro } from '@/types/liked-pros'

type Props = {
  pro: LikedPro
  onBook: () => void
}

export function LikedProCard({ pro, onBook }: Props) {
  const domainLabel = pro.service_domain === 'nails' ? '美甲師' : '美睫師'
  const initial = (pro.pro_display_name[0] ?? 'P').toUpperCase()

  return (
    <XStack paddingHorizontal={16} paddingVertical={12} alignItems="center" gap={12}>
      <View
        width={44}
        height={44}
        borderRadius={22}
        backgroundColor="#E8E9E9"
        alignItems="center"
        justifyContent="center"
      >
        <Text fontSize={16} fontWeight="700" color="#4d4c48">{initial}</Text>
      </View>

      <YStack flex={1} gap={2}>
        <Text fontSize={15} fontWeight="700" color="#1F2723">{pro.pro_display_name}</Text>
        <Text fontSize={13} color="#626765">{domainLabel}</Text>
      </YStack>

      <Pressable
        onPress={onBook}
        style={({ pressed }) => ({
          borderRadius: 9999,
          height: 34,
          paddingHorizontal: 16,
          backgroundColor: '#1F2723',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.7 : 1,
        })}
        accessibilityLabel={`預約 ${pro.pro_display_name}`}
        accessibilityRole="button"
      >
        <Text fontSize={13} fontWeight="600" color="#FBFBF8">預約</Text>
      </Pressable>
    </XStack>
  )
}
