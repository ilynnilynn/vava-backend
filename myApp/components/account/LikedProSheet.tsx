// components/account/LikedProSheet.tsx
import { Modal, Pressable } from 'react-native'
import { YStack, XStack, Text, View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { FA6ProIcon } from '@/components/FA6ProIcon'

import { useBookingRequest } from '@/lib/booking-context'
import type { LikedPro } from '@/types/liked-pros'

type Props = {
  pro: LikedPro | null
  onClose: () => void
}

export function LikedProSheet({ pro, onClose }: Props) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { dispatch } = useBookingRequest()

  function handleBook() {
    if (!pro) return
    dispatch({ type: 'RESET' })
    dispatch({
      type: 'SET_CATEGORY',
      payload: pro.service_domain === 'nails' ? 'nails' : 'lashes',
    })
    onClose()
    router.push('/book/slots')
  }

  return (
    <Modal
      visible={pro !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      {pro && (
        <YStack flex={1} backgroundColor="#FBFBF8">
          {/* Handle */}
          <YStack alignItems="center" paddingTop={8} paddingBottom={4}>
            <View width={36} height={4} borderRadius={2} backgroundColor="#E8E9E9" />
          </YStack>

          {/* Nav bar */}
          <XStack height={48} alignItems="center" paddingHorizontal={12}>
            <View flex={1} />
            <Text fontSize={16} fontWeight="600" color="#1F2723">設計師資訊</Text>
            <View flex={1} alignItems="flex-end">
              <Pressable
                onPress={onClose}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                accessibilityLabel="關閉"
              >
                <FA6ProIcon name="xmark" size={20} color="#1F2723" />
              </Pressable>
            </View>
          </XStack>

          {/* Pro info */}
          <YStack flex={1} alignItems="center" justifyContent="center" gap={16} paddingHorizontal={24}>
            <View
              width={80}
              height={80}
              borderRadius={40}
              backgroundColor="#E8E9E9"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize={28} fontWeight="700" color="#4d4c48">
                {(pro.pro_display_name[0] ?? 'P').toUpperCase()}
              </Text>
            </View>
            <YStack alignItems="center" gap={4}>
              <Text fontSize={20} fontWeight="700" color="#1F2723">{pro.pro_display_name}</Text>
              <Text fontSize={15} color="#626765">
                {pro.service_domain === 'nails' ? '美甲師' : '美睫師'}
              </Text>
            </YStack>
          </YStack>

          {/* CTA */}
          <YStack paddingHorizontal={16} paddingBottom={insets.bottom + 24}>
            <Pressable
              onPress={handleBook}
              style={{
                borderRadius: 9999,
                height: 48,
                backgroundColor: '#1F2723',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text fontSize={16} fontWeight="600" color="#FBFBF8">開始預約</Text>
            </Pressable>
          </YStack>
        </YStack>
      )}
    </Modal>
  )
}
