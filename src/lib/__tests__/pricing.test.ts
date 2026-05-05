import { describe, it, expect } from 'vitest'
import { minMax, getDensityDelta, getFillInPriceField, formatPriceRange } from '../pricing'

// ── minMax ───────────────────────────────────────────────────

describe('minMax', () => {
  it('returns min and max from a list of prices', () => {
    expect(minMax([500, 800, 300, 1200])).toEqual({ min: 300, max: 1200 })
  })

  it('returns same value for single-element array', () => {
    expect(minMax([750])).toEqual({ min: 750, max: 750 })
  })

  it('returns { min: 0, max: 0 } for empty array', () => {
    expect(minMax([])).toEqual({ min: 0, max: 0 })
  })
})

// ── getDensityDelta ──────────────────────────────────────────

describe('getDensityDelta', () => {
  const row = {
    density_light_delta: -100,
    density_daily_delta: 0,
    density_heavy_delta: 200,
  }

  it('returns light delta', () => {
    expect(getDensityDelta(row, 'light')).toBe(-100)
  })

  it('returns daily delta', () => {
    expect(getDensityDelta(row, 'daily')).toBe(0)
  })

  it('returns heavy delta', () => {
    expect(getDensityDelta(row, 'heavy')).toBe(200)
  })

  it('returns 0 when density is undefined', () => {
    expect(getDensityDelta(row)).toBe(0)
  })

  it('returns 0 when density is null', () => {
    expect(getDensityDelta(row, null)).toBe(0)
  })

  it('defaults to 0 when row delta is null', () => {
    const nullRow = { density_light_delta: null, density_daily_delta: null, density_heavy_delta: null }
    expect(getDensityDelta(nullRow, 'heavy')).toBe(0)
  })
})

// ── getFillInPriceField ──────────────────────────────────────

describe('getFillInPriceField', () => {
  it('returning customer, ≤14 days → same_shop_14_price', () => {
    expect(getFillInPriceField(true, 10)).toBe('same_shop_14_price')
    expect(getFillInPriceField(true, 14)).toBe('same_shop_14_price')
  })

  it('returning customer, 15-21 days → same_shop_21_price', () => {
    expect(getFillInPriceField(true, 15)).toBe('same_shop_21_price')
    expect(getFillInPriceField(true, 21)).toBe('same_shop_21_price')
  })

  it('new customer, ≤14 days → outside_shop_14_price', () => {
    expect(getFillInPriceField(false, 7)).toBe('outside_shop_14_price')
  })

  it('new customer, 15-21 days → outside_shop_21_price', () => {
    expect(getFillInPriceField(false, 18)).toBe('outside_shop_21_price')
  })

  it('returns null for >21 days', () => {
    expect(getFillInPriceField(true, 22)).toBeNull()
    expect(getFillInPriceField(false, 30)).toBeNull()
  })
})

// ── formatPriceRange ─────────────────────────────────────────

describe('formatPriceRange', () => {
  it('formats a range with different min/max', () => {
    const result = formatPriceRange({ min: 800, max: 1200 })
    expect(result).toContain('800')
    expect(result).toContain('1,200')
    expect(result).toMatch(/^NT\$/)
  })

  it('formats a single price when min === max', () => {
    const result = formatPriceRange({ min: 500, max: 500 })
    expect(result).toBe('NT$500')
    expect(result).not.toContain('–')
  })
})
