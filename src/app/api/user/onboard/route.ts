// ============================================================
// POST /api/user/onboard
//
// Saves the customer's phone and birth_year after first login.
// Called by the /onboarding page.
//
// Requires an active session (checked via cookie).
// Returns 200 on success.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Taiwan mobile: starts with 09, 10 digits
const PHONE_REGEX = /^09\d{8}$/

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Verify session
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse + validate body
  let phone: string
  let birth_year: number
  try {
    const body = await req.json()
    phone      = String(body.phone ?? '').trim()
    birth_year = Number(body.birth_year)
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!PHONE_REGEX.test(phone)) {
    return NextResponse.json(
      { error: '手機號碼格式錯誤，請輸入 09 開頭的 10 碼號碼' },
      { status: 400 }
    )
  }

  const currentYear = new Date().getFullYear()
  if (!Number.isInteger(birth_year) || birth_year < 1950 || birth_year > currentYear - 16) {
    return NextResponse.json(
      { error: '出生年份無效' },
      { status: 400 }
    )
  }

  // Save to public.users
  const { error: updateError } = await supabase
    .from('users')
    .update({ phone, birth_year })
    .eq('id', user.id)

  if (updateError) {
    console.error('[user/onboard] update error:', updateError)
    return NextResponse.json({ error: '儲存失敗，請重試' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
