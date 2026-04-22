// components/account/SettingsRow.tsx
import { Pressable } from 'react-native'
import { XStack, Text } from 'tamagui'
import { FontAwesome6 } from '@expo/vector-icons'

type Props = {
  label: string
  onPress?: () => void
  disabled?: boolean
  labelColor?: string
  showChevron?: boolean
}

export function SettingsRow({
  label,
  onPress,
  disabled = false,
  labelColor = '#1F2723',
  showChevron = true,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({ opacity: disabled ? 0.38 : pressed ? 0.6 : 1 })}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <XStack height={48} paddingHorizontal={16} alignItems="center" justifyContent="space-between">
        <Text fontSize={15} lineHeight={22} color={labelColor}>
          {label}
        </Text>
        {showChevron && !disabled && (
          <FontAwesome6 name="chevron-right" size={12} color="#808868" />
        )}
      </XStack>
    </Pressable>
  )
}
