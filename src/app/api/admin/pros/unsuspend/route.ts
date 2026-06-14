// ============================================================
// POST /api/admin/pros/unsuspend
//
// Admin-only: removes suspension from a pro.
// Sets is_suspended = false. Standing is re-synced from flags.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getFlagsForEntity, computeStanding } from '@/lib/flags'

export async function POST(req: NextRequest) {
  // ── Auth + admin check ───────────────────────────────────
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: userRow } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!userRow?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── Parse body ───────────────────────────────────────────
  let body: { proId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { proId } = body
  if (!proId) {
    return NextResponse.json({ error: 'proId is required' }, { status: 400 })
  }

  // ── Unsuspend — recompute standing from flags ─────────────
  const admin = createAdminClient()
  const flags = await getFlagsForEntity(proId)
  const standing = computeStanding(flags)

  const { error: updateError } = await admin
    .from('pros')
    .update({
      is_suspended: false,
      standing,
    })
    .eq('id', proId)

  if (updateError) {
    console.error('[admin/pros/unsuspend] update error:', updateError)
    return NextResponse.json({ error: 'Failed to unsuspend' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
