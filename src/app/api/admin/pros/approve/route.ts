// ============================================================
// POST /api/admin/pros/approve
//
// Admin-only: approves a pending pro.
// Sets is_approved = true and sends in-app + push notification.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notify } from '@/lib/notifications'

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

  // ── Approve ──────────────────────────────────────────────
  const admin = createAdminClient()

  const { data: updated, error: updateError } = await admin
    .from('pros')
    .update({
      is_approved: true,
      verification_status: 'approved',
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', proId)
    .eq('verification_status', 'pending')
    .select('id, user_id')

  if (updateError) {
    console.error('[admin/pros/approve] update error:', updateError)
    return NextResponse.json({ error: 'Failed to approve' }, { status: 500 })
  }

  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: 'This pro has already been reviewed.' }, { status: 409 })
  }

  const approvedPro = updated[0]

  // ── Notify pro (in-app + push) ────────────────────────
  try {
    const { data: proUser } = await admin
      .from('users')
      .select('push_token_expo')
      .eq('id', approvedPro.user_id)
      .single()

    await notify({
      userId: approvedPro.user_id,
      pushToken: proUser?.push_token_expo,
      type: 'pro_application_approved',
      title: '設計師申請已通過 🎉',
      body: '恭喜！您的 VAVA 設計師帳號已通過審核。立即前往後台開放時段，開始接受預約。',
    })
  } catch (err) {
    console.error('[admin/pros/approve] notification error:', err)
  }

  return NextResponse.json({ ok: true })
}
