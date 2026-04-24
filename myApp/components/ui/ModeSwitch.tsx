// components/ui/ModeSwitch.tsx
import { Switch } from 'react-native'

type Props = {
  value: boolean
  onValueChange: (value: boolean) => void
}

export function ModeSwitch({ value, onValueChange }: Props) {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#b0aea5', true: '#141413' }}
      thumbColor="#ffffff"
    />
  )
}
