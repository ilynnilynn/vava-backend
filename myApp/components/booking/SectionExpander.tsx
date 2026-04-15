import { useEffect, useRef, type ReactNode } from 'react'
import { LayoutAnimation, UIManager, Platform, View } from 'react-native'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

type Props = {
  visible: boolean
  children: ReactNode
}

export function SectionExpander({ visible, children }: Props) {
  const didMount = useRef(false)

  useEffect(() => {
    if (didMount.current) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    } else {
      didMount.current = true
    }
  }, [visible])

  if (!visible) return null

  return <View>{children}</View>
}
