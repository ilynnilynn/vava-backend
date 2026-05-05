// components/HeartButton.tsx
import { Pressable } from 'react-native'
import { AppIcon } from '@/components/AppIcon'

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
      <AppIcon
        name="favorite"
        size={size}
        color={isLiked ? '#CC3352' : '#E8E9E9'}
        weight={isLiked ? 'solid' : 'regular'}
      />
    </Pressable>
  )
}
