// ============================================================
// GET /api/auth/line/callback
//
// LINE redirects here after the user approves login.
// This route:
//   1. Verifies the state cookie (CSRF check)
//   2. Exchanges the code for a LINE access token
//   3. Fetches the user's LINE profile
//   4. Finds or creates a Supabase Auth user
//   5. Generates a magic link → redirects user to it
//      (the magic link sets the Supabase session cookie)
//   6. After session is set, Supabase sends user to /auth/callback
//      which upserts the public user/pro row and routes them home
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import {
  exchangeLineCode,
  getLineProfile,
  createLineSession,
} from '@/lib/auth'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code  = searchParams.get('code')
  const state = searchParams.get('state')

  // ── CSRF check ────────────────────────────────────────────
  const storedState = req.cookies.get('line_oauth_state')?.value
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=state_mismatch`
    )
  }

  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=no_code`
    )
  }

  // state format: "{nonce}:{type}"
  const userType = state.split(':')[1] === 'pro' ? 'pro' : 'customer'
  const loginPath = userType === 'pro' ? '/pro/login' : '/login'

  try {
    // ── Exchange code → LINE token ────────────────────────
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/line/callback`
    const tokens      = await exchangeLineCode(code, redirectUri)

    // ── Get LINE profile ──────────────────────────────────
    const profile = await getLineProfile(tokens.access_token)

    // ── Generate magic link → sets session cookie ─────────
    // generateLink creates the user if they don't exist, or
    // issues a new link if they do. No separate createUser needed.
    // After Supabase processes the magic link, it redirects to:
    //   /auth/callback?type=customer  (or pro)
    // That client page upserts the public user/pro row.
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
    const magicLink   = await createLineSession({
      lineUserId:  profile.userId,
      displayName: profile.displayName,
      pictureUrl:  profile.pictureUrl,
      redirectTo:  callbackUrl,
      userType,
    })

    const response = NextResponse.redirect(magicLink)
    response.cookies.delete('line_oauth_state')
    return response

  } catch (err) {
    console.error('[line/callback] error:', err)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}${loginPath}?error=auth_failed`
    )
  }
}
