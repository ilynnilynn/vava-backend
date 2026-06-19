import { describe, it, expect } from 'vitest'
import { haversineKm } from '../geo'

describe('haversineKm', () => {
  it('returns 0 for same point', () => {
    expect(haversineKm(25.033, 121.565, 25.033, 121.565)).toBe(0)
  })

  it('computes Taipei 101 to Taipei Main Station (~2.5 km)', () => {
    // Taipei 101: 25.0340, 121.5645
    // Taipei Main Station: 25.0478, 121.5170
    const d = haversineKm(25.0340, 121.5645, 25.0478, 121.5170)
    expect(d).toBeGreaterThan(2)
    expect(d).toBeLessThan(6)
  })

  it('computes Taipei to Kaohsiung (~300 km)', () => {
    const d = haversineKm(25.033, 121.565, 22.627, 120.301)
    expect(d).toBeGreaterThan(280)
    expect(d).toBeLessThan(320)
  })
})
