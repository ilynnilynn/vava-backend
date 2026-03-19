// ============================================================
// LINE WEBHOOK — POST /api/webhooks/line
//
// Receives events from LINE Messaging API (follow, unfollow, etc.)
// Primary purpose: capture line_user_id when a user adds the VAVA OA
// so we can send them push notifications later.
//
// Setup:
//   1. Set webhook URL in LINE Developer Console:
//      https://<your-domain>/api/webhooks/line
//   2. Add LINE_CHANNEL_SECRET to .env.local
//   3. Enable "Use webhook" in LINE console
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

// ── Signature validation ────────────────────────────────────

function validateSignature(body: string, signature: string): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET
  if (!secret) {
    console.warn('[line-webhook] LINE_CHANNEL_SECRET not set — skipping validation')
    return true // allow in dev
  }

  const digest = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64')

  const sigBuf = Buffer.from(signature)
  const digBuf = Buffer.from(digest)
  if (sigBuf.length !== digBuf.length) return false
  return crypto.timingSafeEqual(digBuf, sigBuf)
}

// ── Event handlers ──────────────────────────────────────────

// On follow: user added the VAVA LINE OA.
// Try to match their LINE user ID to an existing users or pros row
// and store it so push notifications work.
async function handleFollow(lineUserId: string): Promise<void> {
  const admin = createAdminClient()

  // Check if this LINE user ID is already stored (idempotent)
  const { data: existingUser } = await admin
    .from('users')
    .select('id')
    .eq('line_user_id', lineUserId)
    .maybeSingle()

  if (existingUser) {
    console.log('[line-webhook] follow: user already has line_user_id', lineUserId)
    return
  }

  const { data: existingPro } = await admin
    .from('pros')
    .select('id')
    .eq('line_user_id', lineUserId)
    .maybeSingle()

  if (existingPro) {
    console.log('[line-webhook] follow: pro already has line_user_id', lineUserId)
    return
  }

  // If no match, the user hasn't logged in via LINE OAuth yet.
  // Their line_user_id will be captured during auth callback instead.
  // This is expected for users who follow the OA before signing up.
  console.log('[line-webhook] follow: no matching user/pro for', lineUserId, '— will be linked on login')
}

// On unfollow: user blocked or removed the VAVA LINE OA.
// We don't delete the line_user_id — push sends will just fail silently.
// This preserves the association if they re-follow later.
async function handleUnfollow(lineUserId: string): Promise<void> {
  console.log('[line-webhook] unfollow:', lineUserId)
}

// ── Route handler ───────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const body = JSON.parse(rawBody)
  const events = body.events ?? []

  // LINE verification ping sends empty events — return 200 immediately
  if (events.length === 0) {
    return NextResponse.json({ ok: true })
  }

  // Validate signature for real events only
  const signature = req.headers.get('x-line-signature') ?? ''
  if (!validateSignature(rawBody, signature)) {
    console.error('[line-webhook] invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  for (const event of events) {
    const lineUserId = event.source?.userId
    if (!lineUserId) continue

    switch (event.type) {
      case 'follow':
        await handleFollow(lineUserId)
        break
      case 'unfollow':
        await handleUnfollow(lineUserId)
        break
      default:
        console.log('[line-webhook] unhandled event type:', event.type)
    }
  }

  // LINE requires a 200 response within 1s
  return NextResponse.json({ ok: true })
}
