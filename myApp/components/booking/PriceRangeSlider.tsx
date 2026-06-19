import { useRef } from 'react'
import { Animated, PanResponder, View } from 'react-native'

const THUMB = 28
const HIT = 52
const HIT_OFFSET = (HIT - THUMB) / 2
const MIN_GAP = 4

type Props = {
  min: number
  max: number
  lowValue: number
  highValue: number
  onLowChange: (v: number) => void
  onHighChange: (v: number) => void
  onDragStart?: () => void
  onDragEnd?: () => void
}

export function PriceRangeSlider({
  min, max, lowValue, highValue, onLowChange, onHighChange,
  onDragStart, onDragEnd,
}: Props) {
  const trackWRef = useRef(0)
  const lowXRef = useRef(0)
  const highXRef = useRef(0)
  const lowStartX = useRef(0)
  const highStartX = useRef(0)
  const minRef = useRef(min)
  const maxRef = useRef(max)
  minRef.current = min
  maxRef.current = max
  const onDragStartRef = useRef(onDragStart)
  const onDragEndRef = useRef(onDragEnd)
  onDragStartRef.current = onDragStart
  onDragEndRef.current = onDragEnd
  const onLowChangeRef = useRef(onLowChange)
  const onHighChangeRef = useRef(onHighChange)
  onLowChangeRef.current = onLowChange
  onHighChangeRef.current = onHighChange

  const lowAnim = useRef(new Animated.Value(0)).current
  const highAnim = useRef(new Animated.Value(0)).current
  const fillLeftAnim = useRef(new Animated.Value(THUMB / 2)).current
  const fillWidthAnim = useRef(new Animated.Value(0)).current

  function valueToX(v: number, usable: number) {
    return ((v - minRef.current) / (maxRef.current - minRef.current)) * usable
  }
  function xToValue(x: number, usable: number) {
    const lo = minRef.current, hi = maxRef.current
    return Math.round((lo + ((hi - lo) * x) / usable) / 100) * 100
  }
  function syncFill(lx: number, hx: number) {
    fillLeftAnim.setValue(lx + THUMB / 2)
    fillWidthAnim.setValue(Math.max(0, hx - lx))
  }
  function initPositions(trackW: number) {
    const usable = Math.max(1, trackW - THUMB)
    const lx = valueToX(lowValue, usable)
    const hx = valueToX(highValue, usable)
    lowXRef.current = lx
    highXRef.current = hx
    lowAnim.setValue(lx)
    highAnim.setValue(hx)
    syncFill(lx, hx)
  }

  const lowPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => { lowStartX.current = lowXRef.current; onDragStartRef.current?.() },
      onPanResponderMove: (_, g) => {
        const usable = Math.max(1, trackWRef.current - THUMB)
        const x = Math.max(0, Math.min(highXRef.current - MIN_GAP, lowStartX.current + g.dx))
        lowXRef.current = x
        lowAnim.setValue(x)
        syncFill(x, highXRef.current)
        onLowChangeRef.current(xToValue(x, usable))
      },
      onPanResponderRelease: (_, g) => {
        const usable = Math.max(1, trackWRef.current - THUMB)
        lowXRef.current = Math.max(0, Math.min(highXRef.current - MIN_GAP, lowStartX.current + g.dx))
        syncFill(lowXRef.current, highXRef.current)
        onLowChangeRef.current(xToValue(lowXRef.current, usable))
        onDragEndRef.current?.()
      },
      onPanResponderTerminate: (_, g) => {
        const usable = Math.max(1, trackWRef.current - THUMB)
        lowXRef.current = Math.max(0, Math.min(highXRef.current - MIN_GAP, lowStartX.current + g.dx))
        syncFill(lowXRef.current, highXRef.current)
        onLowChangeRef.current(xToValue(lowXRef.current, usable))
        onDragEndRef.current?.()
      },
    })
  ).current

  const highPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => { highStartX.current = highXRef.current; onDragStartRef.current?.() },
      onPanResponderMove: (_, g) => {
        const usable = Math.max(1, trackWRef.current - THUMB)
        const x = Math.max(lowXRef.current + MIN_GAP, Math.min(usable, highStartX.current + g.dx))
        highXRef.current = x
        highAnim.setValue(x)
        syncFill(lowXRef.current, x)
        onHighChangeRef.current(xToValue(x, usable))
      },
      onPanResponderRelease: (_, g) => {
        const usable = Math.max(1, trackWRef.current - THUMB)
        highXRef.current = Math.max(lowXRef.current + MIN_GAP, Math.min(usable, highStartX.current + g.dx))
        syncFill(lowXRef.current, highXRef.current)
        onHighChangeRef.current(xToValue(highXRef.current, usable))
        onDragEndRef.current?.()
      },
      onPanResponderTerminate: (_, g) => {
        const usable = Math.max(1, trackWRef.current - THUMB)
        highXRef.current = Math.max(lowXRef.current + MIN_GAP, Math.min(usable, highStartX.current + g.dx))
        syncFill(lowXRef.current, highXRef.current)
        onHighChangeRef.current(xToValue(highXRef.current, usable))
        onDragEndRef.current?.()
      },
    })
  ).current

  return (
    <View onLayout={e => {
      trackWRef.current = e.nativeEvent.layout.width
      initPositions(e.nativeEvent.layout.width)
    }}>
      <View style={{ height: HIT }}>
        {/* Background track */}
        <View style={{
          position: 'absolute',
          left: THUMB / 2, right: THUMB / 2,
          top: (HIT - 3) / 2,
          height: 3, backgroundColor: '#D8D9D2', borderRadius: 2,
        }} />
        {/* Active fill */}
        <Animated.View style={{
          position: 'absolute',
          left: fillLeftAnim,
          width: fillWidthAnim,
          top: (HIT - 3) / 2,
          height: 3, backgroundColor: '#1F2723', borderRadius: 2,
        }} />
        {/* Low thumb */}
        <Animated.View
          {...lowPan.panHandlers}
          style={{
            position: 'absolute',
            left: lowAnim,
            transform: [{ translateX: -HIT_OFFSET }],
            width: HIT, height: HIT,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <View style={{
            width: THUMB, height: THUMB, borderRadius: THUMB / 2,
            backgroundColor: '#1F2723',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 3,
          }} />
        </Animated.View>
        {/* High thumb */}
        <Animated.View
          {...highPan.panHandlers}
          style={{
            position: 'absolute',
            left: highAnim,
            transform: [{ translateX: -HIT_OFFSET }],
            width: HIT, height: HIT,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <View style={{
            width: THUMB, height: THUMB, borderRadius: THUMB / 2,
            backgroundColor: '#1F2723',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 3,
          }} />
        </Animated.View>
      </View>
    </View>
  )
}
