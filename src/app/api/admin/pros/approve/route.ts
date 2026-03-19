// ============================================================
// POST /api/admin/pros/approve
//
// Admin-only: approves a pending pro.
// Sets is_approved = true and sends LINE notification.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyProApproved } from '@/lib/notifications'

export async function POST(req: NextRequest) {
  // ── Auth + admin check ───────────────────────────────────
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check app_metadata (matches admin layout guard)
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
  let body: { proId?: string; proLineUserId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { proId, proLineUserId } = body
  if (!proId) {
    return NextResponse.json({ error: 'proId is required' }, { status: 400 })
  }

  // ── Approve ──────────────────────────────────────────────
  const admin = createAdminClient()

  const { error: updateError } = await admin
    .from('pros')
    .update({ is_approved: true })
    .eq('id', proId)

  if (updateError) {
    console.error('[admin/pros/approve] update error:', updateError)
    return NextResponse.json({ error: 'Failed to approve' }, { status: 500 })
  }

  // ── Notify via LINE (best-effort) ────────────────────────
  if (proLineUserId) {
    try {
      const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pro/dashboard`
      await notifyProApproved({ proLineUserId, dashboardUrl })
    } catch (err) {
      console.error('[admin/pros/approve] LINE notification failed:', err)
    }
  }

  return NextResponse.json({ ok: true })
}
