// ============================================================
// POST /api/bookings/confirm
//
// Instant-confirm a booking: validate → check slot → insert
// booking → lock slot → notify pro via LINE.
//
// Requires an active customer session (checked via cookie).
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { confirmBooking, type ConfirmBookingParams } from '@/lib/bookings'
import { notifyProBookingConfirmed } from '@/lib/notifications'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // ── Auth ──────────────────────────────────────────────────
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return NextResponse.json({ error: 'durationMinutes must be a positive number' }, { status: 400 })
  }
  if (![10, 15, 20].includes(noShowWindowMinutes)) {
    return NextResponse.json({ error: 'noShowWindowMinutes must be 10, 15, or 20' }, { status: 400 })
  }
  if (!Number.isFinite(priceMin) || !Number.isFinite(priceMax) || priceMin < 0 || priceMax < priceMin) {
    return NextResponse.json({ error: 'Invalid price range' }, { status: 400 })
  }
  if (serviceCategoryIds.length === 0 || !serviceCategoryIds.every((id: unknown) => typeof id === 'string')) {
    return NextResponse.json({ error: 'serviceCategoryIds must be a non-empty string array' }, { status: 400 })
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
    styleId: typeof body.styleId === 'string' ? body.styleId : null,
    lashDensity: body.lashDensity as ConfirmBookingParams['lashDensity'],
    lashSpecialFiberTagId: typeof body.lashSpecialFiberTagId === 'string' ? body.lashSpecialFiberTagId : null,
    lashStyleTags: Array.isArray(body.lashStyleTags) ? body.lashStyleTags : null,
    addonIds: Array.isArray(body.addonIds) ? body.addonIds : null,
    nailScope: body.nailScope as ConfirmBookingParams['nailScope'],
    treatmentTier: body.treatmentTier as ConfirmBookingParams['treatmentTier'],
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

  // ── Notify pro via LINE ───────────────────────────────────
  // Fetch pro + customer data for the notification (best-effort, don't fail the booking)
  try {
    const [{ data: pro }, { data: customer }] = await Promise.all([
      supabase.from('pros').select('line_user_id, display_name, studio_address').eq('id', proId).single(),
      supabase.from('users').select('display_name, phone').eq('id', user.id).single(),
    ])

    if (pro?.line_user_id && customer) {
      const dt = new Date(startsAt)
      const dateTime = `${dt.getMonth() + 1}月${dt.getDate()}日 ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`

      const cats = serviceCategoryIds as string[]
      const { data: categories } = await supabase
        .from('service_categories')
        .select('name_zh')
        .in('id', cats)

      const serviceSummary = categories?.map(c => c.name_zh).join(' · ') ?? '服務'

      await notifyProBookingConfirmed({
        proLineUserId: pro.line_user_id,
        customerName: customer.display_name,
        customerPhone: customer.phone,
        dateTime,
        serviceSummary,
        studioAddress: pro.studio_address,
        refPhotoUrl: params.briefingRefPhotoUrl,
        preferences: params.preference ?? undefined,
        customerNote: params.customerNote,
      })
    }
  } catch (err) {
    // Log but don't fail the booking — notification is best-effort
    console.error('[bookings/confirm] notification error:', err)
  }

  return NextResponse.json({ ok: true, booking: result.data })
}
