// ============================================================
// AUTH — Supabase Google OAuth + session helpers
//
// Flow:
//   1. /login calls supabase.auth.signInWithOAuth({ provider: 'google' })
//   2. Google redirects → Supabase → /auth/callback
//   3. /auth/callback sets session, calls /api/auth/finalize
//   4. finalize upserts public.users or public.pros row, returns redirect
// ============================================================

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

// ── Cached getUser (React Server Components) ─────────────────
//
// Deduplicates supabase.auth.getUser() within a single React
// render pass.  Layout + page + nested server components all
// share ONE HTTP call to the Supabase Auth API.
// Middleware runs in a separate Edge context and is unaffected.

export const getAuthUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

// ── User / Pro row upserts ────────────────────────────────────

// Called in /api/auth/finalize after session is set.
// Creates or updates the row in public.users.
export async function upsertUser(params: {
  supabaseUserId: string
  email: string
  name: string
  pictureUrl?: string | null
}): Promise<void> {
  const admin = createAdminClient()

  const { error } = await admin
    .from('users')
    .upsert(
      {
        id: params.supabaseUserId,
      },
      { onConflict: 'id', ignoreDuplicates: false }
    )

  if (error) {
    console.error('[upsertUser] failed:', error)
    throw new Error(`Failed to upsert user row: ${error.message}`)
  }
}

// Called in /api/auth/finalize for pro users.
// Creates or updates the row in public.pros for a pro applicant.
// Note: is_approved starts false — admin must approve via dashboard.
export async function upsertPro(params: {
  supabaseUserId: string
  name: string
  pictureUrl?: string | null
}): Promise<void> {
  const admin = createAdminClient()

  await admin
    .from('pros')
    .upsert(
      {
        id:                params.supabaseUserId,
        user_id:           params.supabaseUserId,
        display_name:      params.name,
        profile_photo_url: params.pictureUrl ?? null,
        is_approved:       false,
        is_accepting:      false,
        subscription_status: 'free',
        confirmed_booking_count: 0,
        standing:          'good',
        no_show_window_minutes: 15,
      },
      { onConflict: 'id', ignoreDuplicates: false }
    )
}

// ── Rating token (signed HMAC) ────────────────────────────────
//
// Sent in the rating prompt message as a URL param.
// Format: base64url(payload).<hmac-sha256>
// Payload: { bookingId, userId, exp }
//
// Why not JWT library: avoids a dependency.
// The SUPABASE_SERVICE_ROLE_KEY is already a robust secret
// and is never exposed client-side.

const RATING_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function getRatingSecret(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set')
  return secret
}

function b64url(data: string): string {
  return Buffer.from(data).toString('base64url')
}

function sign(payload: string): string {
  return crypto
    .createHmac('sha256', getRatingSecret())
    .update(payload)
    .digest('base64url')
}

// Creates a signed token to use as ?token= in the rating URL.
export function createRatingToken(bookingId: string, userId: string): string {
  const payload = b64url(JSON.stringify({
    bookingId,
    userId,
    exp: Date.now() + RATING_TOKEN_TTL_MS,
  }))
  const sig = sign(payload)
  return `${payload}.${sig}`
}

// Verifies the token and returns its contents.
// Throws if the token is invalid, tampered, or expired.
export function verifyRatingToken(token: string): {
  bookingId: string
  userId: string
} {
  const [payload, sig] = token.split('.')
  if (!payload || !sig) throw new Error('Invalid rating token format')

  const expected = sign(payload)
  if (!crypto.timingSafeEqual(Buffer.from(sig, 'base64url'), Buffer.from(expected, 'base64url'))) {
    throw new Error('Rating token signature invalid')
  }

  const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
  if (Date.now() > data.exp) throw new Error('Rating token expired')

  return { bookingId: data.bookingId, userId: data.userId }
}
