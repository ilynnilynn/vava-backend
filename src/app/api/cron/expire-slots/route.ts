// ============================================================
// GET /api/cron/expire-slots
//
// Marks past slots as expired (is_expired = true).
// Runs every 5 minutes via Vercel Cron.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { expireStaleSlots } from '@/lib/slots'

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    await expireStaleSlots(supabase)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[cron/expire-slots] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
