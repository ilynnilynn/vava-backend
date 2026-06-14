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

  // Google OAuth provides: full_name, avatar_url, email
  const name    = meta.full_name || meta.name || ''
  const picture = meta.avatar_url || meta.picture || null
  const email   = user.email || ''

  // Determine user type from metadata or request body.
  // Default: customer. Pro mode is set inside the app after login.
  const type = meta.auth_type || body.type || 'customer'

  try {
    if (type === 'pro') {
      // Pro users also need a users row for notifications FK
      await upsertUser({
        supabaseUserId,
        email,
        name,
        pictureUrl: picture || null,
      })

      await upsertPro({
        supabaseUserId,
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
        email,
        name,
        pictureUrl: picture || null,
      })

      // Check if user is admin — admins can access /admin/verification
      const { data: userRow } = await supabase
        .from('users')
        .select('phone, birth_year, is_admin')
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
