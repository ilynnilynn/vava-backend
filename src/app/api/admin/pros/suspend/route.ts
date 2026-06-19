// ============================================================
// POST /api/admin/pros/suspend
//
// Admin-only: suspends an approved pro.
// Sets is_suspended = true, is_accepting = false.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

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

  // ── Suspend ──────────────────────────────────────────────
  const admin = createAdminClient()

  const { error: updateError } = await admin
    .from('pros')
    .update({
      is_suspended: true,
      is_accepting: false,
      standing: 'suspended',
    })
    .eq('id', proId)

  if (updateError) {
    console.error('[admin/pros/suspend] update error:', updateError)
    return NextResponse.json({ error: 'Failed to suspend' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
