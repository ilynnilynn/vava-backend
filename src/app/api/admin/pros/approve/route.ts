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

  // Check admin status from public.users — the single source of truth
  const { data: userRow } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!userRow?.is_admin) {
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

  // TODO: Add reviewed_by column to pros table, then store user.id or user.email here
  const { data: updated, error: updateError } = await admin
    .from('pros')
    .update({
      is_approved: true,
      verification_status: 'approved',
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', proId)
    .eq('verification_status', 'pending')
    .select('id, user_id, line_user_id')

  if (updateError) {
    console.error('[admin/pros/approve] update error:', updateError)
    return NextResponse.json({ error: 'Failed to approve' }, { status: 500 })
  }

  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: 'This pro has already been reviewed.' }, { status: 409 })
  }

  const approvedPro = updated[0]

  // ── In-app notification (always) ────────────────────────
  await admin.from('notifications').insert({
    user_id: approvedPro.user_id,
    type: 'pro_application_approved',
    title: '設計師申請已通過 🎉',
    body: '恭喜！您的 VAVA 設計師帳號已通過審核。立即前往後台開放時段，開始接受預約。',
  })

  // ── LINE notification (best-effort) ────────────────────
  const lineId = proLineUserId || approvedPro.line_user_id
  if (lineId) {
    try {
      const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pro/dashboard`
      await notifyProApproved({ proLineUserId: lineId, dashboardUrl })
    } catch (err) {
      console.error('[admin/pros/approve] LINE notification failed:', err)
    }
  }

  return NextResponse.json({ ok: true })
}
