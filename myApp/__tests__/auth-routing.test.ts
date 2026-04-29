// __tests__/auth-routing.test.ts
import { deriveRoute } from '../lib/auth-routing'

describe('deriveRoute', () => {
  it('returns auth/login when no session', () => {
    expect(deriveRoute(false, null, null)).toBe('/(auth)/login')
  })

  it('returns onboarding/customer/name when authed but no display_name', () => {
    expect(deriveRoute(true, null, null)).toBe('/(onboarding)/customer/name')
  })

  it('returns tabs when authed + display_name + no pro row', () => {
    expect(deriveRoute(true, 'Alice', null)).toBe('/(tabs)/')
  })

  it('returns onboarding/pro/submitted when pro row not approved', () => {
    expect(deriveRoute(true, 'Alice', false)).toBe('/(onboarding)/pro/submitted')
  })

  it('returns pro-tabs when pro row approved', () => {
    expect(deriveRoute(true, 'Alice', true)).toBe('/(pro-tabs)/')
  })
})
