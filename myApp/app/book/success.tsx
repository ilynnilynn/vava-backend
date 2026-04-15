import { YStack, Text } from 'tamagui'

export default function SuccessScreen() {
  return (
    <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
      <Text fontSize="$6" color="$color">Success</Text>
    </YStack>
  )
}
