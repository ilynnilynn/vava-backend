import type { ReactNode } from 'react'
import { View } from 'react-native'

type Props = {
  visible: boolean
  children: ReactNode
}

/**
 * Show/hide children without unmounting.
 * Uses display:'none' to keep layout stable for animations.
 */
export function SectionExpander({ visible, children }: Props) {
  if (!visible) return null
  return <View>{children}</View>
}
