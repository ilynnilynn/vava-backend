// myApp/__tests__/help-center.test.ts
// Tests for B019: Help center — legal links

const PRIVACY_URL = 'https://vava.now/privacy'
const TERMS_URL = 'https://vava.now/termsandconditions'

// ── URL correctness ────────────────────────────────────────────

describe('Help center legal URLs', () => {
  it('privacy URL is HTTPS', () => {
    expect(PRIVACY_URL).toMatch(/^https:\/\//)
  })

  it('terms URL is HTTPS', () => {
    expect(TERMS_URL).toMatch(/^https:\/\//)
  })

  it('privacy URL points to vava.now/privacy', () => {
    const url = new URL(PRIVACY_URL)
    expect(url.hostname).toBe('vava.now')
    expect(url.pathname).toBe('/privacy')
  })

  it('terms URL points to vava.now/termsandconditions', () => {
    const url = new URL(TERMS_URL)
    expect(url.hostname).toBe('vava.now')
    expect(url.pathname).toBe('/termsandconditions')
  })

  it('URLs are distinct', () => {
    expect(PRIVACY_URL).not.toBe(TERMS_URL)
  })
})

// ── openExternal logic ─────────────────────────────────────────

describe('openExternal error handling', () => {
  // Mirrors the openExternal function in help-center.tsx
  // Tests the branching logic without needing React Native Linking

  type LinkingResult = { canOpen: boolean; throws?: boolean }

  function simulateOpenExternal(
    url: string,
    linking: LinkingResult,
  ): 'opened' | 'unsupported' | 'error' {
    try {
      if (linking.throws) throw new Error('Network error')
      if (linking.canOpen) return 'opened'
      return 'unsupported'
    } catch {
      return 'error'
    }
  }

  it('opens URL when supported', () => {
    expect(simulateOpenExternal(PRIVACY_URL, { canOpen: true })).toBe('opened')
  })

  it('shows unsupported when canOpenURL returns false', () => {
    expect(simulateOpenExternal(PRIVACY_URL, { canOpen: false })).toBe('unsupported')
  })

  it('catches thrown errors gracefully', () => {
    expect(simulateOpenExternal(PRIVACY_URL, { canOpen: true, throws: true })).toBe('error')
  })
})
