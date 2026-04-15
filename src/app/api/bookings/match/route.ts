// ============================================================
// POST /api/bookings/match
//
// Cross-pro slot matching: find available slots across all
// accepting pros that match service domain, dates, time, and
// distance criteria.
//
// Requires an active customer session (checked via cookie).
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMatchingSlots } from '@/lib/slots'
import type { TimeBand } from '@/lib/slots'

const VALID_DOMAINS = ['nails', 'lashes'] as const
const VALID_TIME_BANDS: TimeBand[] = ['morning', 'afternoon', 'evening']

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // ── Auth ──────────────────────────────────────────────────
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Parse body ────────────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // ── Validate domain ────────────────────────────────────────
  const domain = body.domain
  if (typeof domain !== 'string' || !VALID_DOMAINS.includes(domain as typeof VALID_DOMAINS[number])) {
    return NextResponse.json({ error: 'domain must be "nails" or "lashes"' }, { status: 400 })
  }

  // ── Validate dates ─────────────────────────────────────────
  const dates = body.dates
  if (!Array.isArray(dates) || dates.length === 0 || !dates.every(d => typeof d === 'string')) {
    return NextResponse.json({ error: 'dates must be a non-empty array of strings' }, { status: 400 })
  }

  // ── Validate lat/lng (optional) ────────────────────────────
  const lat = body.lat !== undefined && body.lat !== null ? Number(body.lat) : null
  const lng = body.lng !== undefined && body.lng !== null ? Number(body.lng) : null

  if (lat !== null && !Number.isFinite(lat)) {
    return NextResponse.json({ error: 'lat must be a valid number' }, { status: 400 })
  }
  if (lng !== null && !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'lng must be a valid number' }, { status: 400 })
  }

  // ── Validate timeBand (optional) ───────────────────────────
  const timeBand = body.timeBand ?? null
  if (timeBand !== null && (typeof timeBand !== 'string' || !VALID_TIME_BANDS.includes(timeBand as TimeBand))) {
    return NextResponse.json({ error: 'timeBand must be "morning", "afternoon", or "evening"' }, { status: 400 })
  }

  // ── Validate optional fields ───────────────────────────────
  const categoryIds = Array.isArray(body.categoryIds) ? body.categoryIds as string[] : undefined
  const styleId = typeof body.styleId === 'string' ? body.styleId : null
  const maxDistanceKm = typeof body.maxDistanceKm === 'number' && Number.isFinite(body.maxDistanceKm)
    ? body.maxDistanceKm
    : undefined

  // ── Execute matching ───────────────────────────────────────
  try {
    const results = await getMatchingSlots(
      {
        domain: domain as 'nails' | 'lashes',
        categoryIds,
        styleId,
        lat,
        lng,
        dates: dates as string[],
        timeBand: timeBand as TimeBand | null,
        maxDistanceKm,
      },
      supabase
    )

    return NextResponse.json({ results, total: results.length })
  } catch (err) {
    console.error('[bookings/match] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
