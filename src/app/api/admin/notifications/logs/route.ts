// ============================================================
// GET /api/admin/notifications/logs — List notification send history
//
// Query params:
//   - channel: filter by channel ('line', 'push', 'in_app')
//   - type: filter by notification type
//   - success: filter by success ('true' or 'false')
//   - limit: max results (default 50, max 200)
//   - offset: pagination offset
//
// Admin-only.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)

  const channel = searchParams.get('channel')
  const type = searchParams.get('type')
  const success = searchParams.get('success')
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 200)
  const offset = Number(searchParams.get('offset')) || 0

  let query = supabase
    .from('notification_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (channel) query = query.eq('channel', channel)
  if (type) query = query.eq('type', type)
  if (success === 'true') query = query.eq('success', true)
  if (success === 'false') query = query.eq('success', false)

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ logs: data, total: count })
}
