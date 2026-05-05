// ============================================================
// POST /api/admin/pros/decline
//
// Admin-only: declines a pending pro with reasons.
// Sets verification_status = 'rejected' and stores reasons.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  // ── Auth + admin check ───────────────────────────────────
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let isAdmin = user.app_metadata?.is_admin === true

  if (!isAdmin) {
    const admin = createAdminClient()
    const { data: { user: freshUser } } = await admin.auth.admin.getUserById(user.id)
    isAdmin = freshUser?.app_metadata?.is_admin === true
  }

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── Parse body ───────────────────────────────────────────
  let body: { proId?: string; reasons?: string[]; note?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { proId, reasons, note } = body

  if (!proId) {
    return NextResponse.json({ error: 'proId is required' }, { status: 400 })
  }

  if (!reasons || !Array.isArray(reasons) || reasons.length === 0) {
    return NextResponse.json({ error: 'reasons must be a non-empty array' }, { status: 400 })
  }

  // ── Decline ────────────────────────────────────────────────
  const admin = createAdminClient()

  const { error: updateError } = await admin
    .from('pros')
    .update({
      is_approved: false,
      verification_status: 'rejected',
      rejection_reasons: reasons,
      rejection_note: note ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', proId)

  if (updateError) {
    console.error('[admin/pros/decline] update error:', updateError)
    return NextResponse.json({ error: 'Failed to decline' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
