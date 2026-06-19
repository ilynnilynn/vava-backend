import { useEffect } from 'react'
import { YStack, Text, View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { AppIcon } from '@/components/AppIcon'
import { useBookingRequest } from '@/lib/booking-context'

export default function SuccessScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { dispatch } = useBookingRequest()

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch({ type: 'RESET' })
      router.dismissAll()
      router.replace('/(tabs)/bookings')
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <YStack flex={1} backgroundColor="#FBFBF8" paddingTop={insets.top} paddingBottom={insets.bottom}>
      <YStack flex={1} justifyContent="center" alignItems="center" gap={24}>
        <View
          width={80}
          height={80}
          borderRadius={40}
          backgroundColor="#ECF0E4"
          alignItems="center"
          justifyContent="center"
        >
          <AppIcon name="success" size={48} color="#33CC87" />
        </View>
        <Text fontSize={24} fontWeight="700" lineHeight={32} color="#1F2723">
          預約成功！
        </Text>
      </YStack>
    </YStack>
  )
}
