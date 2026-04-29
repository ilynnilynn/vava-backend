// __tests__/types-smoke.test.ts
// Smoke test: ensure new type fields are present.
// If the types are wrong, TS will fail to compile this file.
import type { User, Pro, ServiceDomain } from '../types/database'

describe('type smoke tests', () => {
  it('User has display_name, birthday, gender', () => {
    const u: User = {
      id: 'x',
      display_name: 'Test',
      phone: '0900000000',
      birthday: null,
      gender: null,
      profile_photo_url: null,
      auth_provider: 'google',
      line_notifications: false,
      created_at: '',
      updated_at: '',
      push_token_expo: null,
    }
    expect(u.display_name).toBe('Test')
    expect(u.birthday).toBeNull()
    expect(u.gender).toBeNull()
  })

  it('Pro has domains array', () => {
    const p = { domains: ['nails', 'lashes'] } as Pick<Pro, 'domains'>
    expect(p.domains).toHaveLength(2)
  })

  it('ServiceDomain includes makeup', () => {
    const d: ServiceDomain = 'makeup'
    expect(['nails', 'lashes', 'makeup']).toContain(d)
  })
})
