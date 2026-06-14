// ============================================================
// GET /api/admin/notifications/templates — List all templates
// PATCH /api/admin/notifications/templates — Update a template
//
// Admin-only. Uses admin client (no user session needed for admin routes).
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('notification_templates')
    .select('*')
    .order('type')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ templates: data })
}

export async function PATCH(req: NextRequest) {
  const supabase = createAdminClient()

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.title_zh === 'string') updates.title_zh = body.title_zh
  if (typeof body.body_zh === 'string') updates.body_zh = body.body_zh
  if (typeof body.is_active === 'boolean') updates.is_active = body.is_active

  const { data, error } = await supabase
    .from('notification_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ template: data })
}
