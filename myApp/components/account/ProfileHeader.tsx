// components/account/ProfileHeader.tsx
import { Alert, Pressable } from 'react-native'
import { XStack, YStack, Text, View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FontAwesome6 } from '@expo/vector-icons'
import type { LayoutChangeEvent } from 'react-native'

type Props = {
  displayName: string
  roleLabel: string
  avatarInitial: string
  /** Pass TOGGLE_HEIGHT when toggle is shown, 0 when hidden */
  toggleHeight: number
  onLayout: (event: LayoutChangeEvent) => void
}

export function ProfileHeader({
  displayName,
  roleLabel,
  avatarInitial,
  toggleHeight,
  onLayout,
}: Props) {
  const insets = useSafeAreaInsets()

  return (
    <YStack
      backgroundColor="#F0EDE5"
      paddingTop={insets.top + 12}
      paddingHorizontal={16}
      paddingBottom={toggleHeight > 0 ? toggleHeight / 2 : 16}
      onLayout={onLayout}
    >
      <XStack alignItems="center" justifyContent="space-between">
        <XStack alignItems="center" gap={12}>
          {/* Avatar — initials placeholder */}
          <View
            width={48}
            height={48}
            borderRadius={24}
            backgroundColor="#d4b8a0"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize={18} fontWeight="700" color="#FBFBF8">
              {avatarInitial}
            </Text>
          </View>
          <YStack>
            <Text fontSize={16} fontWeight="700" color="#1F2723">
              {displayName}
            </Text>
            <Text fontSize={13} color="#808868">
              {roleLabel}
            </Text>
          </YStack>
        </XStack>

        {/* Notification icon — placeholder */}
        <Pressable
          onPress={() => Alert.alert('通知', '通知中心即將推出')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="通知"
        >
          <View
            width={36}
            height={36}
            borderRadius={18}
            backgroundColor="rgba(0,0,0,0.06)"
            alignItems="center"
            justifyContent="center"
          >
            <FontAwesome6 name="bell" size={16} color="#1F2723" />
          </View>
        </Pressable>
      </XStack>
    </YStack>
  )
}
