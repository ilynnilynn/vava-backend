// ============================================================
// POST /api/auth/finalize
//
// Called by /auth/callback (client page) after the session
// is confirmed in the browser.
//
// Does the server-side work:
//   1. Verifies the session via cookie
//   2. Upserts the public user or pro row
//   3. Returns the correct redirect URL for this user's state
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { upsertUser, upsertPro } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'No session' }, { status: 401 })
  }

  const supabaseUserId = user.id

  const meta = user.user_metadata ?? {}

  const type       = meta.auth_type    || body.type       || 'customer'
  const lineUserId = meta.line_user_id || body.lineUserId || ''
  const name       = meta.name         || body.name       || ''
  const picture    = meta.picture      || body.picture    || null

  try {
    if (type === 'pro') {
      await upsertPro({
        supabaseUserId,
        lineUserId,
        name,
        pictureUrl: picture || null,
      })

      const { data: pro } = await supabase
        .from('pros')
        .select('is_approved, submitted_at, standing')
        .eq('id', supabaseUserId)
        .single()

      if (!pro)                          return NextResponse.json({ redirectTo: '/pro/onboarding' })
      if (pro.standing === 'suspended')  return NextResponse.json({ redirectTo: '/pro/suspended' })
      if (pro.submitted_at) return NextResponse.json({ redirectTo: '/pro/dashboard' })
      return NextResponse.json({ redirectTo: '/pro/onboarding' })

    } else {
      await upsertUser({
        supabaseUserId,
        lineUserId,
        name,
        pictureUrl: picture || null,
      })

      const { data: userRow } = await supabase
        .from('users')
        .select('phone, birth_year')
        .eq('id', supabaseUserId)
        .single()

      const onboardingComplete = userRow?.phone && userRow?.birth_year
      if (!onboardingComplete) return NextResponse.json({ redirectTo: '/onboarding' })
      return NextResponse.json({ redirectTo: '/home' })
    }

  } catch (err) {
    console.error('[auth/finalize] error:', err)
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 })
  }
}
