// ============================================================
// AUTH — LINE OAuth 2.0 + Supabase session helpers
//
// Why custom LINE flow:
//   LINE is not a native Supabase provider.
//   We need line_user_id captured during auth so
//   the notification system can push LINE messages to the user.
//   Without line_user_id there is no way to send LINE OA messages.
//
// Flow summary:
//   1. GET /api/auth/line            → redirect user to LINE OAuth URL
//   2. LINE redirects to /api/auth/line/callback?code=xxx&state=xxx
//   3. Exchange code → LINE access token → GET LINE profile
//   4. supabaseAdmin.createUser({ email: `${lineUserId}@line.local` })
//   5. supabaseAdmin.generateLink({ type: 'magiclink', email })
//   6. Redirect user to action_link → Supabase sets session cookie
//   7. /auth/callback: exchangeCodeForSession + upsert user/pro row + route
//
// Setup:
//   LINE_CHANNEL_ID       → LINE Developer Console → Basic settings
//   LINE_CHANNEL_SECRET   → LINE Developer Console → Basic settings
//   SUPABASE_SERVICE_ROLE_KEY → Supabase Dashboard → API settings
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

// ── LINE OAuth helpers ────────────────────────────────────────

const LINE_AUTH_BASE  = 'https://access.line.me/oauth2/v2.1'
const LINE_API_BASE   = 'https://api.line.me/v2'
const LINE_TOKEN_URL  = 'https://api.line.me/oauth2/v2.1/token'

// Build the URL that sends the user to LINE's login screen.
// state: a random string you generate per request (CSRF protection).
// redirectUri: must exactly match what's registered in LINE Developer Console.
export function getLineAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     process.env.LINE_CHANNEL_ID!,
    redirect_uri:  redirectUri,
    state,
    scope:         'profile openid',
  })
  return `${LINE_AUTH_BASE}/authorize?${params.toString()}`
}

// Exchange the one-time code LINE sent back for an access token.
export async function exchangeLineCode(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; id_token?: string }> {
  const res = await fetch(LINE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      redirect_uri:  redirectUri,
      client_id:     process.env.LINE_CHANNEL_ID!,
      client_secret: process.env.LINE_CHANNEL_SECRET!,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`LINE token exchange failed: ${res.status} ${body}`)
  }

  return res.json()
}

// Fetch the user's LINE profile (userId, displayName, pictureUrl).
export async function getLineProfile(accessToken: string): Promise<{
  userId: string
  displayName: string
  pictureUrl?: string
}> {
  const res = await fetch(`${LINE_API_BASE}/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`LINE profile fetch failed: ${res.status} ${body}`)
  }

  return res.json()
}

// ── Supabase user provisioning ────────────────────────────────

// Find or create a Supabase Auth user for a given LINE user.
// Uses synthetic email: {lineUserId}@line.local
// Returns the Supabase user id (UUID).
export async function getOrCreateSupabaseUser(
  lineUserId: string,
  displayName: string,
  pictureUrl?: string
): Promise<string> {
  const admin = createAdminClient()
  const email = `${lineUserId}@line.local`

  // Try to create first — fastest path for new users
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,   // skip email verification — LINE already verified identity
    user_metadata: {
      line_user_id: lineUserId,
      name:         displayName,
      picture:      pictureUrl ?? null,
    },
  })

  if (created?.user) return created.user.id

  // User already exists (returning user) — find them by email
  // Supabase admin API has no getUserByEmail, so we use listUsers.
  // perPage: 1000 is fine for MVP scale.
  if (createError) {
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const found = list?.users?.find(u => u.email === email)
    if (found) return found.id
    throw new Error(`Failed to create or find Supabase user: ${createError.message}`)
  }

  throw new Error('Unexpected error in getOrCreateSupabaseUser')
}

// Generate a one-time magic link for the LINE user.
// Redirecting the user to this link sets their Supabase session cookie.
//
// generateLink handles both cases:
//   - New user:      creates the Supabase Auth user + generates link
//   - Existing user: generates a new link (user already exists, no re-create)
//
// redirectTo = the URL Supabase will redirect to after session is set
export async function createLineSession(params: {
  lineUserId:  string
  displayName: string
  pictureUrl?: string | null
  redirectTo:  string
  userType:    'customer' | 'pro'
}): Promise<string> {
  const admin = createAdminClient()
  const email = `${params.lineUserId}@line.local`

  // generateLink handles both new and existing users:
  //   - New user: creates auth user + generates magic link
  //   - Existing user: generates magic link (no re-create)
  // data.user contains the user object with their ID.
  const { data, error } = await admin.auth.admin.generateLink({
    type:  'magiclink',
    email,
    options: {
      redirectTo: params.redirectTo,
      data: {
        auth_type:    params.userType,
        line_user_id: params.lineUserId,
        name:         params.displayName,
        picture:      params.pictureUrl ?? null,
      },
    },
  })

  if (error || !data.properties?.action_link) {
    throw new Error(`Failed to generate LINE magic link: ${error?.message}`)
  }

  // generateLink's data option only sets metadata for NEW users.
  // For returning users, explicitly update metadata so auth_type is current.
  const userId = data.user?.id
  if (userId) {
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: {
        auth_type:    params.userType,
        line_user_id: params.lineUserId,
        name:         params.displayName,
        picture:      params.pictureUrl ?? null,
      },
    })
    if (updateError) console.error('[createLineSession] updateUserById failed:', updateError)
  }

  return data.properties.action_link
}

// ── User / Pro row upserts ────────────────────────────────────

// Called in /auth/callback after session is set.
// Creates or updates the row in public.users for a customer.
export async function upsertUser(params: {
  supabaseUserId: string
  lineUserId: string
  name: string
  pictureUrl?: string | null
}): Promise<void> {
  const admin = createAdminClient()

  // Only use columns confirmed to exist in the live DB.
  // display_name, profile_photo_url, auth_provider, line_notifications
  // may not exist yet (schema drift) — omit to avoid upsert failure.
  const { error } = await admin
    .from('users')
    .upsert(
      {
        id:           params.supabaseUserId,
        line_user_id: params.lineUserId,
      },
      { onConflict: 'id', ignoreDuplicates: false }
    )

  if (error) {
    console.error('[upsertUser] failed:', error)
    throw new Error(`Failed to upsert user row: ${error.message}`)
  }
}

// Called in /pro/auth/callback after session is set.
// Creates or updates the row in public.pros for a pro applicant.
// Note: is_approved starts false — admin must approve via dashboard.
export async function upsertPro(params: {
  supabaseUserId: string
  lineUserId: string
  name: string
  pictureUrl?: string | null
}): Promise<void> {
  const admin = createAdminClient()

  await admin
    .from('pros')
    .upsert(
      {
        id:                params.supabaseUserId,
        line_user_id:      params.lineUserId,
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
// Sent in the rating prompt LINE message as a URL param.
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
// The URL is sent in the LINE post-completion message.
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
