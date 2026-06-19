// components/account/SettingsRow.tsx
import type { ReactNode } from 'react'
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
  customIcon?: ReactNode
  showChevron?: boolean
  rightText?: string
}

export function SettingsRow({
  label,
  onPress,
  disabled = false,
  labelColor = '#1F2723',
  iconName,
  iconColor = '#1F2723',
  iconSize = 22,
  customIcon,
  showChevron = false,
  rightText,
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
          {(iconName || customIcon) && (
            <View width={22} height={22} alignItems="center" justifyContent="center">
              {customIcon ?? <AppIcon name={iconName!} size={iconSize} color={iconColor} weight="regular" />}
            </View>
          )}
          <Text fontSize={15} lineHeight={22} color={labelColor}>
            {label}
          </Text>
        </XStack>
        {rightText ? (
          <Text fontSize={14} lineHeight={20} color="#787D7B">{rightText}</Text>
        ) : showChevron && !disabled ? (
          <AppIcon name="forward" size={13} color="#787D7B" />
        ) : null}
      </XStack>
    </Pressable>
  )
}
