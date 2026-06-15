// ============================================================
// POST /api/admin/pros/decline
//
// Admin-only: declines a pending pro with reasons.
// Sets verification_status = 'declined' and stores reasons.
// In-app notification is handled by database trigger (migration 0042).
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateDeclineReasons } from '@/lib/verification'
import { sendPushNotification } from '@/lib/notifications'

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
  let body: { proId?: string; reasons?: string[]; note?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { proId, reasons, note } = body

  if (!proId || typeof proId !== 'string') {
    return NextResponse.json({ error: 'proId is required' }, { status: 400 })
  }

  if (!validateDeclineReasons(reasons)) {
    return NextResponse.json(
      { error: 'reasons must be a non-empty array of valid decline reasons' },
      { status: 400 },
    )
  }

  const trimmedNote = typeof note === 'string' ? note.trim() : null

  // ── Decline ────────────────────────────────────────────────
  const admin = createAdminClient()

  const { data: updated, error: updateError } = await admin
    .from('pros')
    .update({
      is_approved: false,
      verification_status: 'declined',
      rejection_reasons: reasons,
      rejection_note: trimmedNote || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', proId)
    .eq('verification_status', 'pending')
    .select('id, user_id')

  if (updateError) {
    console.error('[admin/pros/decline] update error:', updateError)
    return NextResponse.json({ error: 'Failed to decline' }, { status: 500 })
  }

  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: 'This pro has already been reviewed.' }, { status: 409 })
  }

  // In-app notification is handled by database trigger (migration 0042).
  // Send push notification for the pro (best-effort).
  try {
    const { data: proUser } = await admin
      .from('users')
      .select('push_token_expo')
      .eq('id', updated[0].user_id)
      .single()

    if (proUser?.push_token_expo) {
      await sendPushNotification({
        pushToken: proUser.push_token_expo,
        title: '申請審核結果',
        body: '您的設計師申請審核結果已出，請查看應用內通知。',
        data: { type: 'pro_application_declined' },
      })
    }
  } catch (err) {
    console.error('[admin/pros/decline] push notification error:', err)
  }

  return NextResponse.json({ ok: true })
}
