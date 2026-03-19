// ============================================================
// PRICING — price range derivation
//
// Price ranges are derived from pro_services at search time.
// Final price confirmed by pro at session — ranges are estimates.
//
// Rule: all price range calculations go through this file.
// ============================================================

import { createClient } from '@/lib/supabase/server'
import type { LashDensity } from '@/types/database'

export type PriceRange = { min: number; max: number }

// ── Nails ─────────────────────────────────────────────────────

// Derive price range for nails across matching pros.
// Called on the confirm screen and pro search results.
export async function getNailsPriceRange(params: {
  proId?: string           // if set: single pro (for confirm screen). If null: all matching pros.
  categoryIds: string[]
  styleId?: string | null
  addonIds?: string[] | null
  nailPackageId?: string | null   // if set: use pro_nail_packages
}): Promise<PriceRange> {
  const supabase = await createClient()

  // ── Package path ──
  if (params.nailPackageId) {
    let query = supabase
      .from('pro_nail_packages')
      .select('price_ntd')
      .eq('id', params.nailPackageId)
      .eq('is_enabled', true)

    if (params.proId) query = query.eq('pro_id', params.proId)

    const { data } = await query
    return minMax((data ?? []).map(r => r.price_ntd))
  }

  // ── Standard nails path ──
  let query = supabase
    .from('pro_services')
    .select('price_ntd')
    .in('category_id', params.categoryIds)
    .eq('is_enabled', true)

  if (params.styleId) query = query.eq('style_id', params.styleId)
  if (params.proId)   query = query.eq('pro_id', params.proId)

  const { data } = await query
  return minMax((data ?? []).map(r => r.price_ntd))
}

// ── Lashes ────────────────────────────────────────────────────

// Derive price range for lashes across matching pros.
export async function getLashesPriceRange(params: {
  proId?: string | null
  categoryId: string
  styleId?: string | null
  density?: LashDensity | null
  fiberTagId?: string | null        // 特殊毛種 — uses pro_special_fiber_prices
  isReturningCustomer?: boolean     // 補睫 only
  fillInDays?: number | null        // 補睫 only — picks correct price field
}): Promise<PriceRange> {
  const supabase = await createClient()

  // ── Special fiber path ──
  if (params.fiberTagId) {
    let query = supabase
      .from('pro_special_fiber_prices')
      .select('price_ntd, density_light_delta, density_daily_delta, density_heavy_delta')
      .eq('tag_id', params.fiberTagId)
      .eq('is_enabled', true)

    if (params.proId) query = query.eq('pro_id', params.proId)

    const { data } = await query
    const prices = (data ?? []).map(r => {
      const delta = getDensityDelta(r, params.density)
      return r.price_ntd + delta
    })
    return minMax(prices)
  }

  // ── Fill-in (補睫) path ──
  if (params.fillInDays !== undefined && params.fillInDays !== null) {
    const field = getFillInPriceField(params.isReturningCustomer ?? true, params.fillInDays)
    if (!field) return { min: 0, max: 0 }  // >21 days = blocked upstream, shouldn't reach here

    let query = supabase
      .from('pro_services')
      .select(`${field}`)
      .eq('category_id', params.categoryId)
      .eq('is_enabled', true)

    if (params.styleId) query = query.eq('style_id', params.styleId)
    if (params.proId)   query = query.eq('pro_id', params.proId)

    const { data } = await query
    const prices = (data ?? []).map((r: Record<string, number>) => r[field]).filter(Boolean)
    return minMax(prices)
  }

  // ── Standard lash service ──
  let query = supabase
    .from('pro_services')
    .select('price_ntd, density_light_delta, density_daily_delta, density_heavy_delta')
    .eq('category_id', params.categoryId)
    .eq('is_enabled', true)

  if (params.styleId) query = query.eq('style_id', params.styleId)
  if (params.proId)   query = query.eq('pro_id', params.proId)

  const { data } = await query
  const prices = (data ?? []).map(r => r.price_ntd + getDensityDelta(r, params.density))
  return minMax(prices)
}

// ── Helpers ───────────────────────────────────────────────────

function minMax(prices: number[]): PriceRange {
  if (!prices.length) return { min: 0, max: 0 }
  return { min: Math.min(...prices), max: Math.max(...prices) }
}

function getDensityDelta(
  row: { density_light_delta: number | null; density_daily_delta: number | null; density_heavy_delta: number | null },
  density?: LashDensity | null
): number {
  if (density === 'light') return row.density_light_delta ?? 0
  if (density === 'daily') return row.density_daily_delta ?? 0
  if (density === 'heavy') return row.density_heavy_delta ?? 0
  return 0
}

// Returns the correct fill-in price field name from pro_services.
// >21 days = blocked upstream — return null to signal a bug if reached.
function getFillInPriceField(
  isReturning: boolean,
  fillInDays: number
): 'same_shop_14_price' | 'same_shop_21_price' | 'outside_shop_14_price' | 'outside_shop_21_price' | null {
  if (fillInDays > 21)   return null
  if (isReturning)       return fillInDays <= 14 ? 'same_shop_14_price'   : 'same_shop_21_price'
  return                        fillInDays <= 14 ? 'outside_shop_14_price' : 'outside_shop_21_price'
}

// Format a price range for display: "NT$800–1,200"
export function formatPriceRange(range: PriceRange): string {
  if (range.min === range.max) return `NT$${range.min.toLocaleString()}`
  return `NT$${range.min.toLocaleString()}–${range.max.toLocaleString()}`
}
