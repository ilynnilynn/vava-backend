// components/HeartButton.tsx
import { Pressable } from 'react-native'
import { FA6ProIcon } from '@/components/FA6ProIcon'

type Props = {
  isLiked: boolean
  onToggle: () => void
  size?: number
}

export function HeartButton({ isLiked, onToggle, size = 20 }: Props) {
  return (
    <Pressable
      onPress={onToggle}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
      accessibilityLabel={isLiked ? '取消收藏' : '收藏設計師'}
      accessibilityRole="button"
    >
      <FA6ProIcon
        name="heart"
        size={size}
        color={isLiked ? '#CC3352' : '#E8E9E9'}
        weight={isLiked ? 'solid' : 'regular'}
      />
    </Pressable>
  )
}
