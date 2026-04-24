// components/account/SettingsRow.tsx
import { Pressable } from 'react-native'
import { XStack, Text, View } from 'tamagui'
import { FA6ProIcon } from '@/components/FA6ProIcon'

type Props = {
  label: string
  onPress?: () => void
  disabled?: boolean
  labelColor?: string
  iconName?: string
  iconColor?: string
  showChevron?: boolean
}

export function SettingsRow({
  label,
  onPress,
  disabled = false,
  labelColor = '#141413',
  iconName,
  iconColor = '#141413',
  showChevron = true,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({ opacity: disabled ? 0.38 : pressed ? 0.6 : 1 })}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      <XStack height={56} paddingHorizontal={20} alignItems="center" justifyContent="space-between">
        <XStack alignItems="center" gap={14} flex={1}>
          {iconName && (
            <View width={22} height={22} alignItems="center" justifyContent="center">
              <FA6ProIcon name={iconName} size={22} color={iconColor} />
            </View>
          )}
          <Text fontSize={15} lineHeight={22} color={labelColor}>
            {label}
          </Text>
        </XStack>
        {showChevron && !disabled && (
          <FA6ProIcon name="chevron-right" size={13} color="#87867f" />
        )}
      </XStack>
    </Pressable>
  )
}
