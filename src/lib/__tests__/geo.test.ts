import { describe, it, expect } from 'vitest'
import { haversineKm, sortByDistance } from '../geo'

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

describe('sortByDistance', () => {
  const items = [
    { id: 'far', studio_lat: 22.627, studio_lng: 120.301 },
    { id: 'close', studio_lat: 25.048, studio_lng: 121.517 },
    { id: 'no-location', studio_lat: null, studio_lng: null },
  ]

  it('sorts closest first, null lat/lng last', () => {
    // User at Taipei 101
    const sorted = sortByDistance(items, 25.034, 121.565)
    expect(sorted[0].id).toBe('close')
    expect(sorted[1].id).toBe('far')
    expect(sorted[2].id).toBe('no-location')
    expect(sorted[2].distanceKm).toBe(Infinity)
  })

  it('attaches distanceKm to each item', () => {
    const sorted = sortByDistance(items, 25.034, 121.565)
    expect(sorted[0].distanceKm).toBeGreaterThan(0)
    expect(sorted[0].distanceKm).toBeLessThan(10)
  })
})
