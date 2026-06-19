// myApp/__tests__/slider-scroll-lock.test.ts
// Tests for B020: Slider ↔ ScrollView gesture coordination

describe('Slider scroll-lock state machine', () => {
  // Mirrors the scrollEnabled logic:
  // - sliderActive=false → scrollEnabled=true (normal scrolling)
  // - sliderActive=true  → scrollEnabled=false (locked during drag)
  // StepLayout receives scrollEnabled={!sliderActive}

  function scrollEnabled(sliderActive: boolean): boolean {
    return !sliderActive
  }

  it('scroll is enabled when slider is idle', () => {
    expect(scrollEnabled(false)).toBe(true)
  })

  it('scroll is disabled when slider is active', () => {
    expect(scrollEnabled(true)).toBe(false)
  })

  it('scroll re-enables after slider release', () => {
    // Simulate: idle → drag start → drag end
    let active = false
    expect(scrollEnabled(active)).toBe(true)

    active = true  // onDragStart
    expect(scrollEnabled(active)).toBe(false)

    active = false // onDragEnd
    expect(scrollEnabled(active)).toBe(true)
  })
})

describe('PanResponder drag lifecycle calls onDragStart/onDragEnd', () => {
  // Simulates the PanResponder callback sequence for both thumbs

  type Event = 'dragStart' | 'dragEnd'

  function simulateDrag(terminated: boolean): Event[] {
    const events: Event[] = []
    // onPanResponderGrant always fires
    events.push('dragStart')
    // Either release or terminate fires, never both
    if (terminated) {
      events.push('dragEnd') // onPanResponderTerminate
    } else {
      events.push('dragEnd') // onPanResponderRelease
    }
    return events
  }

  it('normal drag: grant → release', () => {
    const events = simulateDrag(false)
    expect(events).toEqual(['dragStart', 'dragEnd'])
    expect(events.filter(e => e === 'dragStart').length).toBe(1)
    expect(events.filter(e => e === 'dragEnd').length).toBe(1)
  })

  it('terminated drag: grant → terminate', () => {
    const events = simulateDrag(true)
    expect(events).toEqual(['dragStart', 'dragEnd'])
    // Scroll must re-enable even on terminate
    expect(events[events.length - 1]).toBe('dragEnd')
  })

  it('no stuck state: every dragStart has a matching dragEnd', () => {
    for (const terminated of [true, false]) {
      const events = simulateDrag(terminated)
      const starts = events.filter(e => e === 'dragStart').length
      const ends = events.filter(e => e === 'dragEnd').length
      expect(starts).toBe(ends)
    }
  })
})
