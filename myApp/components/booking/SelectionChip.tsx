import { Pressable } from 'react-native'
import { YStack, Text } from 'tamagui'

type Props = {
  label: string
  selected: boolean
  onPress: () => void
  disabled?: boolean
  subtitle?: string
}

export function SelectionChip({ label, selected, onPress, disabled, subtitle }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !!disabled }}
      accessibilityLabel={subtitle ? `${label} ${subtitle}` : label}
      style={({ pressed }) => ({
        borderRadius: 9999,
        minHeight: 44,
        paddingHorizontal: 16,
        paddingVertical: subtitle ? 8 : 0,
        backgroundColor: selected ? '#1F2723' : '#FBFBF8',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
      })}
    >
      <YStack alignItems="center" gap={1}>
        <Text
          fontSize={14}
          fontWeight="600"
          lineHeight={20}
          color={selected ? '#FBFBF8' : '#1F2723'}
        >
          {label}
        </Text>
        {subtitle && (
          <Text
            fontSize={11}
            lineHeight={16}
            color={selected ? 'rgba(255,255,255,0.6)' : '#858279'}
          >
            {subtitle}
          </Text>
        )}
      </YStack>
    </Pressable>
  )
}
