// ============================================================
// POST /api/ratings/flag
//
// Flag a review as inappropriate.
// Authenticated endpoint — any logged-in user can flag.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { flagRating } from '@/lib/ratings'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const ratingId = typeof body.ratingId === 'string' ? body.ratingId : null
  const reason = typeof body.reason === 'string' ? body.reason.trim() : null

  if (!ratingId) {
    return NextResponse.json({ error: 'ratingId is required' }, { status: 400 })
  }

  if (!reason || reason.length === 0) {
    return NextResponse.json({ error: 'reason is required' }, { status: 400 })
  }

  const result = await flagRating(ratingId, reason)

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
