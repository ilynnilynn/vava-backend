import { FA6ProIcon } from './FA6ProIcon'
import { iconMap, type AppIconName } from '@/constants/iconMap'

type Props = {
  name: AppIconName
  size?: number
  color?: string
  weight?: 'solid' | 'regular'
}

export function AppIcon({ name, size, color, weight }: Props) {
  return <FA6ProIcon name={iconMap[name]} size={size} color={color} weight={weight} />
}
