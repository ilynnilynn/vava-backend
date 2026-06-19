// lib/useKeyboardHeight.ts
// Tracks the current keyboard height, resetting to 0 when hidden.
// Unlike useCTABottom, this has no lock-first-height behavior —
// it always reflects the actual current keyboard state.
// Used for scroll content padding when keyboard is visible.

import { useEffect, useState } from 'react'
import { Keyboard } from 'react-native'

export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      setHeight(e.endCoordinates?.height ?? 0)
    })
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0))
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

  return height
}
