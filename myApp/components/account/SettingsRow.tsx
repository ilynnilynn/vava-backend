// components/account/SettingsRow.tsx
import { Pressable } from 'react-native'
import { XStack, Text, View } from 'tamagui'
import { AppIcon } from '@/components/AppIcon'
import type { AppIconName } from '@/constants/iconMap'

type Props = {
  label: string
  onPress?: () => void
  disabled?: boolean
  labelColor?: string
  iconName?: AppIconName
  iconColor?: string
  iconSize?: number
  showChevron?: boolean
}

export function SettingsRow({
  label,
  onPress,
  disabled = false,
  labelColor = '#1F2723',
  iconName,
  iconColor = '#1F2723',
  iconSize = 22,
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
              <AppIcon name={iconName} size={iconSize} color={iconColor} weight="regular" />
            </View>
          )}
          <Text fontSize={15} lineHeight={22} color={labelColor}>
            {label}
          </Text>
        </XStack>
        {showChevron && !disabled && (
          <AppIcon name="forward" size={13} color="#787D7B" />
        )}
      </XStack>
    </Pressable>
  )
}
