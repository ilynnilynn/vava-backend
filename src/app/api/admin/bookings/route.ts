// ============================================================
// GET /api/admin/bookings
//
// Admin-only: list bookings with optional filters.
// Query params: date, proId, customerId, status, limit, offset
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { BookingStatus } from '@/types/database'

const VALID_STATUSES: BookingStatus[] = [
  'confirmed', 'reschedule_pending', 'rescheduled',
  'cancelled_grace', 'cancelled_customer', 'cancelled_pro',
  'completed', 'no_show_customer', 'no_show_pro', 'expired',
]

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const { data: userRow } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!userRow?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── Parse query params ─────────────────────────────────
  const params = req.nextUrl.searchParams
  const date       = params.get('date')       // YYYY-MM-DD — filter by booking date
  const proId      = params.get('proId')
  const customerId = params.get('customerId')
  const status     = params.get('status')     // single BookingStatus value
  const limit      = Math.min(Number(params.get('limit') || 50), 200)
  const offset     = Number(params.get('offset') || 0)

  // Validate status if provided
  if (status && !VALID_STATUSES.includes(status as BookingStatus)) {
    return NextResponse.json({ error: `Invalid status. Valid: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
  }

  // ── Query ──────────────────────────────────────────────
  const admin = createAdminClient()

  let query = admin
    .from('bookings')
    .select('*, slots!inner(starts_at)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (proId) {
    query = query.eq('pro_id', proId)
  }
  if (customerId) {
    query = query.eq('user_id', customerId)
  }
  if (status) {
    query = query.eq('status', status)
  }
  if (date) {
    // Filter by the slot's starts_at date (YYYY-MM-DD)
    const dayStart = `${date}T00:00:00.000Z`
    const dayEnd   = `${date}T23:59:59.999Z`
    query = query.gte('slots.starts_at', dayStart).lte('slots.starts_at', dayEnd)
  }

  const { data, error: queryError, count } = await query

  if (queryError) {
    console.error('[admin/bookings] query error:', queryError)
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }

  // Flatten: attach starts_at from the joined slot onto each booking
  const bookings = (data ?? []).map((row: Record<string, unknown>) => {
    const { slots, ...booking } = row as Record<string, unknown> & { slots: { starts_at: string } }
    return { ...booking, starts_at: slots?.starts_at ?? null }
  })

  return NextResponse.json({ bookings, total: count ?? bookings.length })
}
