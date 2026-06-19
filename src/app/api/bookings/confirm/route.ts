// ============================================================
// POST /api/bookings/confirm
//
// Instant-confirm a booking: validate → check slot → insert
// booking → lock slot → notify pro + customer.
//
// Requires an active customer session (checked via cookie).
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/server'
import { confirmBooking, getCustomerBookings, type ConfirmBookingParams } from '@/lib/bookings'
import { notify } from '@/lib/notifications'
import { hasTimeOverlap } from '@/lib/overlap'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUUID(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v)
}

function allUUIDs(arr: unknown[]): arr is string[] {
  return arr.every(isUUID)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  // ── Parse body ────────────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // ── Validate required fields ──────────────────────────────
  const proId = typeof body.proId === 'string' ? body.proId.trim() : ''
  const slotId = typeof body.slotId === 'string' ? body.slotId.trim() : ''
  const startsAt = typeof body.startsAt === 'string' ? body.startsAt.trim() : ''
  const durationMinutes = Number(body.durationMinutes)
  const noShowWindowMinutes = Number(body.noShowWindowMinutes)
  const priceMin = Number(body.priceMin)
  const priceMax = Number(body.priceMax)
  const serviceCategoryIds = Array.isArray(body.serviceCategoryIds) ? body.serviceCategoryIds : []

  if (!proId || !slotId || !startsAt) {
    return NextResponse.json({ error: 'proId, slotId, and startsAt are required' }, { status: 400 })
  }
  if (!isUUID(proId) || !isUUID(slotId)) {
    return NextResponse.json({ error: 'proId and slotId must be valid UUIDs' }, { status: 400 })
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return NextResponse.json({ error: 'durationMinutes must be a positive number' }, { status: 400 })
  }
  if (![10, 15, 20].includes(noShowWindowMinutes)) {
    return NextResponse.json({ error: 'noShowWindowMinutes must be 10, 15, or 20' }, { status: 400 })
  }
  if (!Number.isFinite(priceMin) || !Number.isFinite(priceMax) || priceMin < 0 || priceMax < priceMin) {
    return NextResponse.json({ error: 'Invalid price range' }, { status: 400 })
  }
  if (serviceCategoryIds.length === 0 || !allUUIDs(serviceCategoryIds)) {
    return NextResponse.json({ error: 'serviceCategoryIds must be a non-empty array of valid UUIDs' }, { status: 400 })
  }
  if (isNaN(new Date(startsAt).getTime())) {
    return NextResponse.json({ error: 'startsAt must be a valid ISO timestamp' }, { status: 400 })
  }

  // ── Check slot availability ───────────────────────────────
  const { data: slot } = await supabase
    .from('slots')
    .select('id, is_booked, is_expired, pro_id')
    .eq('id', slotId)
    .single()

  if (!slot) {
    return NextResponse.json({ error: '找不到該時段' }, { status: 404 })
  }
  if (slot.is_booked) {
    return NextResponse.json({ error: '該時段已被預約' }, { status: 409 })
  }
  if (slot.is_expired) {
    return NextResponse.json({ error: '該時段已過期' }, { status: 410 })
  }
  if (slot.pro_id !== proId) {
    return NextResponse.json({ error: 'Slot does not belong to this pro' }, { status: 400 })
  }

  // ── Check for time overlap with existing bookings ────────
  const sessionEndsAt = new Date(
    new Date(startsAt).getTime() + durationMinutes * 60 * 1000
  ).toISOString()

  const existingBookings = await getCustomerBookings(user.id, supabase)
  const confirmedBookings = existingBookings
    .filter(b => b.status === 'confirmed')
    .map(b => ({ starts_at: b.starts_at, session_ends_at: b.session_ends_at }))

  if (hasTimeOverlap(confirmedBookings, startsAt, sessionEndsAt)) {
    return NextResponse.json({ error: '此時段與您的其他預約重疊' }, { status: 409 })
  }

  // ── Validate optional UUID fields ─────────────────────────
  const styleId = typeof body.styleId === 'string' ? body.styleId : null
  const lashSpecialFiberTagId = typeof body.lashSpecialFiberTagId === 'string' ? body.lashSpecialFiberTagId : null
  const addonIds = Array.isArray(body.addonIds) ? body.addonIds : null

  if (styleId !== null && !isUUID(styleId)) {
    return NextResponse.json({ error: 'styleId must be a valid UUID' }, { status: 400 })
  }
  if (lashSpecialFiberTagId !== null && !isUUID(lashSpecialFiberTagId)) {
    return NextResponse.json({ error: 'lashSpecialFiberTagId must be a valid UUID' }, { status: 400 })
  }
  if (addonIds !== null && !allUUIDs(addonIds)) {
    return NextResponse.json({ error: 'addonIds must be an array of valid UUIDs' }, { status: 400 })
  }

  // ── Confirm booking ───────────────────────────────────────
  const params: ConfirmBookingParams = {
    userId: user.id,
    proId,
    slotId,
    startsAt,
    durationMinutes,
    noShowWindowMinutes,
    priceMin,
    priceMax,
    serviceCategoryIds: serviceCategoryIds as string[],
    styleId,
    lashDensity: body.lashDensity as ConfirmBookingParams['lashDensity'],
    lashSpecialFiberTagId,
    lashStyleTags: Array.isArray(body.lashStyleTags) ? body.lashStyleTags : null,
    addonIds,
    nailScope: body.nailScope as ConfirmBookingParams['nailScope'],
    treatmentTier: body.treatmentTier as ConfirmBookingParams['treatmentTier'],
    handCategoryIds: Array.isArray(body.handCategoryIds) ? body.handCategoryIds : null,
    handStyleId: typeof body.handStyleId === 'string' ? body.handStyleId : null,
    handTreatmentTier: body.handTreatmentTier as ConfirmBookingParams['handTreatmentTier'],
    footCategoryIds: Array.isArray(body.footCategoryIds) ? body.footCategoryIds : null,
    footStyleId: typeof body.footStyleId === 'string' ? body.footStyleId : null,
    footTreatmentTier: body.footTreatmentTier as ConfirmBookingParams['footTreatmentTier'],
    fillInDays: typeof body.fillInDays === 'number' ? body.fillInDays : null,
    isReturningCustomer: typeof body.isReturningCustomer === 'boolean' ? body.isReturningCustomer : null,
    nailPackageId: typeof body.nailPackageId === 'string' ? body.nailPackageId : null,
    preference: Array.isArray(body.preference) ? body.preference : null,
    customerNote: typeof body.customerNote === 'string' ? body.customerNote.trim() : null,
    briefingRefPhotoUrl: typeof body.briefingRefPhotoUrl === 'string' ? body.briefingRefPhotoUrl : null,
  }

  const result = await confirmBooking(params)

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  // ── Notify pro + customer (in-app + push) ─────────────────
  try {
    const [{ data: pro }, { data: customer }] = await Promise.all([
      supabase.from('pros').select('user_id, display_name').eq('id', proId).single(),
      supabase.from('users').select('display_name, push_token_expo').eq('id', user.id).single(),
    ])

    if (pro && customer) {
      const dt = new Date(startsAt)
      const dateTime = `${dt.getMonth() + 1}月${dt.getDate()}日 ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`

      const cats = serviceCategoryIds as string[]
      const [{ data: categories }, { data: proUser }] = await Promise.all([
        supabase.from('service_categories').select('name_zh').in('id', cats),
        supabase.from('users').select('push_token_expo').eq('id', pro.user_id).single(),
      ])

      const serviceSummary = categories?.map(c => c.name_zh).join(' · ') ?? '服務'

      // Notify pro
      await notify({
        userId: pro.user_id,
        pushToken: proUser?.push_token_expo,
        type: 'booking_confirmed',
        title: '新預約通知',
        body: `${dateTime} — ${serviceSummary}\n客戶：${customer.display_name}`,
        bookingId: result.data?.id,
      })

      // Notify customer
      await notify({
        userId: user.id,
        pushToken: customer.push_token_expo,
        type: 'booking_confirmed',
        title: '預約已確認',
        body: `${dateTime} — ${serviceSummary}\n設計師：${pro.display_name}`,
        bookingId: result.data?.id,
      })
    }
  } catch (err) {
    // Log but don't fail the booking — notification is best-effort
    console.error('[bookings/confirm] notification error:', err)
  }

  return NextResponse.json({ ok: true, booking: result.data })
}
