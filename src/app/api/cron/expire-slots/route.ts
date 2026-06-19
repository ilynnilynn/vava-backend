// ============================================================
// GET /api/cron/expire-slots
//
// Marks past slots as expired (is_expired = true).
// Runs every 5 minutes via Vercel Cron.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireCron } from '@/lib/cron'
import { createAdminClient } from '@/lib/supabase/admin'
import { expireStaleSlots } from '@/lib/slots'

export async function GET(req: NextRequest) {
  const denied = requireCron(req)
  if (denied) return denied

  try {
    const supabase = createAdminClient()
    await expireStaleSlots(supabase)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[cron/expire-slots] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
