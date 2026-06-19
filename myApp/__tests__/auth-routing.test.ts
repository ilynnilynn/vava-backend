// __tests__/auth-routing.test.ts
import { deriveRoute, deriveOnboardingRoute } from '../lib/auth-routing'

const fullUser = {
  display_name: 'Alice',
  phone: '+886912345678',
  birthday: '1995-03-15',
  gender: 'female',
}

describe('deriveOnboardingRoute', () => {
  it('returns name step when user is null', () => {
    expect(deriveOnboardingRoute(null)).toBe('/(onboarding)/customer/name')
  })

  it('returns name step when display_name is null', () => {
    expect(deriveOnboardingRoute({ ...fullUser, display_name: null })).toBe('/(onboarding)/customer/name')
  })

  it('returns name step when phone is null', () => {
    expect(deriveOnboardingRoute({ ...fullUser, phone: null })).toBe('/(onboarding)/customer/name')
  })

  it('returns name step when birthday is null', () => {
    expect(deriveOnboardingRoute({ ...fullUser, birthday: null })).toBe('/(onboarding)/customer/name')
  })

  it('returns name step when gender is null', () => {
    expect(deriveOnboardingRoute({ ...fullUser, gender: null })).toBe('/(onboarding)/customer/name')
  })

  it('returns null when all fields are present', () => {
    expect(deriveOnboardingRoute(fullUser)).toBeNull()
  })

  it('returns first missing field (priority order)', () => {
    // display_name missing takes priority over phone missing
    expect(deriveOnboardingRoute({ ...fullUser, display_name: null, phone: null }))
      .toBe('/(onboarding)/customer/name')
  })
})

describe('deriveRoute', () => {
  it('returns login when no session', () => {
    expect(deriveRoute(false, null, null)).toBe('/(auth)/login')
  })

  it('returns name step when session but no user', () => {
    expect(deriveRoute(true, null, null)).toBe('/(onboarding)/customer/name')
  })

  it('returns name step when only display_name is set', () => {
    expect(deriveRoute(true, { ...fullUser, phone: null, birthday: null, gender: null }, null))
      .toBe('/(onboarding)/customer/name')
  })

  it('returns name step when display_name + phone set but birthday missing', () => {
    expect(deriveRoute(true, { ...fullUser, birthday: null, gender: null }, null))
      .toBe('/(onboarding)/customer/name')
  })

  it('returns name step when only gender missing', () => {
    expect(deriveRoute(true, { ...fullUser, gender: null }, null))
      .toBe('/(onboarding)/customer/name')
  })

  it('returns tabs when all 4 fields complete + no pro row', () => {
    expect(deriveRoute(true, fullUser, null)).toBe('/(tabs)/')
  })

  it('returns tabs when all 4 fields complete + pending pro', () => {
    expect(deriveRoute(true, fullUser, false)).toBe('/(tabs)/')
  })

  it('returns pro-tabs when all 4 fields complete + approved pro', () => {
    expect(deriveRoute(true, fullUser, true)).toBe('/(pro-tabs)/')
  })
})
