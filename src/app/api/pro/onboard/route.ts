// ============================================================
// POST /api/pro/onboard
//
// Receives all pro onboarding data after the 8-step wizard.
// Photos are already uploaded to Supabase Storage by the client.
// This route saves everything to the DB and sets submitted_at.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const PHONE_REGEX = /^09\d{8}$/

interface ServiceInput {
  category_id: string
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // ── Extract + validate ──────────────────────────────────────

  const display_name           = String(body.display_name    ?? '').trim()
  const studio_name            = body.studio_name ? String(body.studio_name).trim() : null
  const phone                  = String(body.phone           ?? '').trim()
  const gender                 = body.gender as string | undefined
  const ig_handle              = body.ig_handle ? String(body.ig_handle).trim() : null
  const studio_address         = String(body.studio_address  ?? '').trim()
  const domain                 = body.domain  as string | undefined
  const nail_scope             = body.nail_scope as string | null | undefined
  const no_show_window_minutes = Number(body.no_show_window_minutes ?? 15)
  const portfolio_urls         = Array.isArray(body.portfolio_urls) ? body.portfolio_urls as string[] : []
  const id_photo_path          = body.id_photo_path as string | null | undefined
  const services               = Array.isArray(body.services) ? body.services as ServiceInput[] : []

  if (!display_name) return NextResponse.json({ error: '請輸入名稱' }, { status: 400 })
  if (!PHONE_REGEX.test(phone)) return NextResponse.json({ error: '手機號碼格式錯誤' }, { status: 400 })
  if (!['male','female','other','prefer_not'].includes(gender ?? '')) return NextResponse.json({ error: '請選擇性別' }, { status: 400 })
  if (!studio_address) return NextResponse.json({ error: '請輸入工作室地址' }, { status: 400 })
  if (!['nails','lashes','both'].includes(domain ?? '')) return NextResponse.json({ error: '請選擇服務類型' }, { status: 400 })
  if (portfolio_urls.length < 3) return NextResponse.json({ error: '至少需要 3 張作品照' }, { status: 400 })
  if (!id_photo_path) return NextResponse.json({ error: '請上傳身分證件' }, { status: 400 })

  // ── Save pros row (admin client — bypasses RLS) ─────────────
  // Uses service role because the pros RLS write policy checks
  // auth.uid() = user_id, which may be NULL for rows created
  // before the Phase 2 user_id fix.
  const admin = createAdminClient()

  const { error: proError } = await admin
    .from('pros')
    .update({
      display_name,
      studio_name,
      phone,
      gender,
      ig_handle,
      studio_address,
      nail_scope:              nail_scope ?? null,
      no_show_window_minutes,
      portfolio_photos:         portfolio_urls,
      id_photo_path:           id_photo_path ?? null,
      submitted_at:            new Date().toISOString(),
      verification_status:     'pending',
    })
    .eq('id', user.id)

  if (proError) {
    console.error('[pro/onboard] pros update error:', proError)
    return NextResponse.json({ error: '儲存失敗，請重試' }, { status: 500 })
  }

  // ── Save pro_services rows ──────────────────────────────────
  // Upsert one row per enabled service category
  if (services.length > 0) {
    const serviceRows = services.map(s => ({
      pro_id:      user.id,
      category_id: s.category_id,
      is_enabled:  true,
    }))

    const { error: svcError } = await admin
      .from('pro_services')
      .upsert(serviceRows, { onConflict: 'pro_id,category_id' })

    if (svcError) {
      console.error('[pro/onboard] pro_services error:', svcError)
      // Non-fatal — pro record is already saved, flag for ops
    }
  }

  return NextResponse.json({ ok: true })
}
