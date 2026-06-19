// ============================================================
// POST /api/admin/pros/decline
//
// Admin-only: declines a pending pro with reasons.
// Sets verification_status = 'declined' and stores reasons.
// Sends both in-app + push notification via notify().
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateDeclineReasons } from '@/lib/verification'
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

  // Send both in-app + push notification (dual delivery)
  try {
    const declinedPro = updated[0]
    const { data: proUser } = await admin
      .from('users')
      .select('push_token_expo')
      .eq('id', declinedPro.user_id)
      .single()

    // Build detailed body with rejection reasons
    let notifBody = '原因：'
    for (const reason of reasons!) {
      notifBody += `\n• ${reason}`
    }
    if (trimmedNote) {
      notifBody += `\n\n備註：${trimmedNote}`
    }
    notifBody += '\n\n請修正後重新申請。'

    await notify({
      userId: declinedPro.user_id,
      pushToken: proUser?.push_token_expo,
      type: 'pro_application_declined',
      title: '設計師申請未通過',
      body: notifBody,
    })
  } catch (err) {
    console.error('[admin/pros/decline] notification error:', err)
  }

  return NextResponse.json({ ok: true })
}
