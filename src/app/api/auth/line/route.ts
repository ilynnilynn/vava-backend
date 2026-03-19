// ============================================================
// GET /api/auth/line
//
// Entry point for LINE Login. Redirects the user to LINE's
// OAuth consent screen.
//
// Query params:
//   ?type=customer  → after login, route to customer home
//   ?type=pro       → after login, route to pro dashboard
//
// The `type` is carried through the OAuth `state` param so
// /api/auth/line/callback knows where to send the user.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getLineAuthUrl } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const type = searchParams.get('type') === 'pro' ? 'pro' : 'customer'

  // state encodes: random nonce + user type
  // Nonce prevents CSRF — we verify it in the callback
  const nonce = crypto.randomUUID()
  const state = `${nonce}:${type}`

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/line/callback`
  const authUrl     = getLineAuthUrl(state, redirectUri)

  // Store state in a short-lived cookie so callback can verify it
  const response = NextResponse.redirect(authUrl)
  response.cookies.set('line_oauth_state', state, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60 * 10,  // 10 minutes — expires if user takes too long
    path:     '/',
  })

  return response
}
