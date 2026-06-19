// lib/useCTABottom.ts
// Shared hook for stable absolute CTA positioning.
//
// Handles the tricky case where:
//   - Keyboard is ALREADY showing when this page mounts (e.g. during slide-from-right
//     navigation while the previous page's keyboard was open).  We read the current
//     keyboard state synchronously so the CTA starts at the right height.
//   - Keyboard shows / hides mid-session: we always follow the latest height so CTA
//     stays 8 px above the keyboard.
//
// RN 0.66+ APIs used: Keyboard.isVisible(), Keyboard.metrics()

import { useEffect, useState } from 'react'
import { Keyboard } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

function currentKeyboardHeight(): number {
  if (!Keyboard.isVisible()) return 0
  const m = Keyboard.metrics()
  return m?.height ?? 0
}

export function useCTABottom(): number {
  const insets = useSafeAreaInsets()

  // Lazy initialiser: read keyboard state synchronously on first render.
  // This handles the case where keyboard is already open when the screen mounts.
  const [keyboardHeight, setKeyboardHeight] = useState<number>(currentKeyboardHeight)

  useEffect(() => {
    // Keep state in sync with real keyboard events
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      const h = e.endCoordinates?.height ?? 0
      setKeyboardHeight(h)
      console.log(`[B002-kbShow] h=${h}`)
    })
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0)
      console.log('[B002-kbHide]')
    })

    // Re-read in case keyboard appeared between the lazy-init and this effect firing
    const h = currentKeyboardHeight()
    setKeyboardHeight(h)
    if (h > 0) console.log(`[B002-mountSync] h=${h}`)

    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  const result = keyboardHeight > 0 ? keyboardHeight + 8 : insets.bottom + 20
  return result
}
