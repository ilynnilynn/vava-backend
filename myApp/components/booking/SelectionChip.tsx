import { Pressable } from 'react-native'
import { Text } from 'tamagui'

type Props = {
  label: string
  selected: boolean
  onPress: () => void
  disabled?: boolean
}

export function SelectionChip({ label, selected, onPress, disabled }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        borderRadius: 9999,
        height: 36,
        paddingHorizontal: 16,
        backgroundColor: selected ? '#1F2723' : '#EAEAE4',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text
        fontSize={14}
        fontWeight="600"
        color={selected ? '#FBFBF8' : '#1F2723'}
      >
        {label}
      </Text>
    </Pressable>
  )
}
