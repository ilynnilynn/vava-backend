// ============================================================
// PROS — pro account management
//
// Rule: import this file everywhere you need pro logic.
// Never write pros queries directly in components or pages.
//
// Admin-only functions (approvePro, getPendingPros) are
// only called from /api/admin/* routes behind is_admin check.
// ============================================================

import { createClient } from '@/lib/supabase/server'
import type { Pro, Result } from '@/types/database'

// ── Read ──────────────────────────────────────────────────────

// Get a pro record by their Supabase auth user id.
// Use this in pro dashboard routes after getting user from session.
export async function getProByUserId(userId: string): Promise<Pro | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('pros')
    .select('*')
    .eq('id', userId)
    .single()
  return data ?? null
}

// Get a pro record by their pros.id (UUID).
// Use this in customer-facing routes when you have a proId from a booking/slot.
export async function getProById(proId: string): Promise<Pro | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('pros')
    .select('*')
    .eq('id', proId)
    .single()
  return data ?? null
}

// Get all pros whose is_accepting = true and is_approved = true.
// Used in customer search results.
export async function getAcceptingPros(): Promise<Pro[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('pros')
    .select('*')
    .eq('is_approved', true)
    .eq('is_accepting', true)
    .neq('standing', 'suspended')  // double-check standing even if is_accepting is stale
    .order('created_at', { ascending: false })
  return data ?? []
}

// ── Pro self-service ──────────────────────────────────────────

// Pro submits their profile for admin review.
// Sets submitted_at so admin queue can sort by arrival order.
// Can only submit if not already approved.
export async function submitForReview(proId: string): Promise<Result<null>> {
  const supabase = await createClient()

  const { data: pro } = await supabase
    .from('pros')
    .select('is_approved, submitted_at')
    .eq('id', proId)
    .single()

  if (!pro)             return { data: null, error: 'Pro not found' }
  if (pro.is_approved)  return { data: null, error: 'Already approved' }

  const { error } = await supabase
    .from('pros')
    .update({ submitted_at: new Date().toISOString() })
    .eq('id', proId)

  return { data: null, error: error?.message ?? null }
}

// Pro toggles their "Accepting Requests Now" status.
// Only allowed if is_approved = true.
// When set to false: pro disappears from search results immediately.
export async function setAccepting(
  proId: string,
  isAccepting: boolean
): Promise<Result<null>> {
  const supabase = await createClient()

  const { data: pro } = await supabase
    .from('pros')
    .select('is_approved')
    .eq('id', proId)
    .single()

  if (!pro)            return { data: null, error: 'Pro not found' }
  if (!pro.is_approved) return { data: null, error: 'Must be approved before accepting bookings' }

  const { error } = await supabase
    .from('pros')
    .update({ is_accepting: isAccepting })
    .eq('id', proId)

  return { data: null, error: error?.message ?? null }
}

// ── Admin functions ───────────────────────────────────────────
// These are called from /api/admin/* — always verify is_admin before calling.

// Get all pros who have submitted for review but are not yet approved.
// Returns in submission order (FIFO queue).
export async function getPendingPros(): Promise<Pro[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('pros')
    .select('*')
    .eq('is_approved', false)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: true })
  return data ?? []
}

// Approve a pro. Sets is_approved = true.
// After this: caller should trigger notifyProApproved() from lib/notifications.ts
export async function approvePro(proId: string): Promise<Result<null>> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('pros')
    .update({ is_approved: true })
    .eq('id', proId)

  return { data: null, error: error?.message ?? null }
}

// Suspend a pro. Sets is_accepting = false and standing = 'suspended'.
// Called automatically by flag evaluation, or manually by admin.
export async function suspendPro(proId: string): Promise<Result<null>> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('pros')
    .update({ standing: 'suspended', is_accepting: false })
    .eq('id', proId)

  return { data: null, error: error?.message ?? null }
}

// Increment the confirmed booking counter.
// Call this after every successful confirmBooking().
// At 10 bookings, subscription_status should be set to 'read_only' if not paying.
export async function incrementBookingCount(proId: string): Promise<Result<null>> {
  const supabase = await createClient()

  const { data: pro } = await supabase
    .from('pros')
    .select('confirmed_booking_count, subscription_status')
    .eq('id', proId)
    .single()

  if (!pro) return { data: null, error: 'Pro not found' }

  const newCount = (pro.confirmed_booking_count ?? 0) + 1
  const hitPaywall = newCount >= 10 && pro.subscription_status === 'free'

  const { error } = await supabase
    .from('pros')
    .update({
      confirmed_booking_count: newCount,
      ...(hitPaywall ? { subscription_status: 'read_only' } : {}),
    })
    .eq('id', proId)

  return { data: null, error: error?.message ?? null }
}
