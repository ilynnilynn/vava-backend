'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { setAccepting } from '@/lib/pros'
import { addSlot, removeSlot, addBlock, removeBlock } from '@/lib/slots'
import { cancelBooking, completeBooking, markNoShow, resolveReschedule } from '@/lib/bookings'
import type { Result, Slot } from '@/types'

// ── Auth helper ─────────────────────────────────────────────

async function getProId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: pro } = await supabase
    .from('pros')
    .select('id')
    .eq('id', user.id)
    .single()

  return pro?.id ?? null
}

// ── Toggle accepting ────────────────────────────────────────

export async function toggleAccepting(isAccepting: boolean): Promise<Result<null>> {
  const proId = await getProId()
  if (!proId) return { data: null, error: 'Not authenticated' }

  const result = await setAccepting(proId, isAccepting)
  revalidatePath('/pro/dashboard')
  return result
}

// ── Slot actions ────────────────────────────────────────────

export async function addSlotAction(startsAt: string): Promise<Result<Slot>> {
  const proId = await getProId()
  if (!proId) return { data: null, error: 'Not authenticated' }

  return addSlot(proId, startsAt)
}

export async function removeSlotAction(slotId: string): Promise<Result<null>> {
  return removeSlot(slotId)
}

// ── Block actions ─────────────────────────────────────────

export async function addBlockAction(
  date: string,
  startTime: string,
  endTime: string,
): Promise<Result<null>> {
  const proId = await getProId()
  if (!proId) return { data: null, error: 'Not authenticated' }

  const result = await addBlock(proId, date, startTime, endTime)
  revalidatePath('/pro/dashboard/slots')
  return { data: null, error: result.error }
}

export async function removeBlockAction(
  slotIds: string[],
): Promise<Result<null>> {
  const proId = await getProId()
  if (!proId) return { data: null, error: 'Not authenticated' }

  const result = await removeBlock(slotIds)
  revalidatePath('/pro/dashboard/slots')
  return result
}

// ── Booking actions ─────────────────────────────────────────

export async function completeBookingAction(bookingId: string): Promise<Result<null>> {
  const result = await completeBooking(bookingId, true) // early = true (pro taps button)
  revalidatePath('/pro/dashboard')
  revalidatePath('/pro/dashboard/history')
  return result
}

export async function markNoShowAction(bookingId: string): Promise<Result<null>> {
  const result = await markNoShow(bookingId, 'pro')
  revalidatePath('/pro/dashboard')
  revalidatePath('/pro/dashboard/history')
  return result
}

export async function cancelBookingAction(bookingId: string): Promise<Result<null>> {
  const result = await cancelBooking(bookingId, 'pro')
  revalidatePath('/pro/dashboard')
  revalidatePath('/pro/dashboard/history')
  return { data: null, error: result.error }
}

export async function resolveRescheduleAction(
  bookingId: string,
  approved: boolean
): Promise<Result<null>> {
  const proId = await getProId()
  if (!proId) return { data: null, error: 'Not authenticated' }

  const supabase = await createClient()

  // Load proposed_slot_id
  const { data: booking } = await supabase
    .from('bookings')
    .select('proposed_slot_id, pro_id')
    .eq('id', bookingId)
    .single()

  if (!booking) return { data: null, error: 'Booking not found' }
  if (booking.pro_id !== proId) return { data: null, error: 'Forbidden' }

  const newSlotId = approved ? (booking.proposed_slot_id ?? undefined) : undefined
  const result = await resolveReschedule(bookingId, approved, newSlotId)

  // Clear proposed_slot_id
  await supabase
    .from('bookings')
    .update({ proposed_slot_id: null })
    .eq('id', bookingId)

  revalidatePath('/pro/dashboard')
  return { data: null, error: result.error }
}

// ── Settings actions ────────────────────────────────────────

export async function updateSettings(formData: {
  display_name?: string
  studio_address?: string
  studio_lat?: number | null
  studio_lng?: number | null
  ig_handle?: string
  phone?: string
  no_show_window_minutes?: 10 | 15 | 20
  portfolio_photos?: string[]
  work_start_hour?: number
  work_end_hour?: number
}): Promise<Result<null>> {
  const proId = await getProId()
  if (!proId) return { data: null, error: 'Not authenticated' }

  const supabase = await createClient()

  // Build update object — only include provided fields
  const update: Record<string, unknown> = {}
  if (formData.display_name !== undefined) update.display_name = formData.display_name
  if (formData.studio_address !== undefined) {
    update.studio_address = formData.studio_address
    update.studio_lat = formData.studio_lat ?? null
    update.studio_lng = formData.studio_lng ?? null
  }
  if (formData.ig_handle !== undefined) update.ig_handle = formData.ig_handle
  if (formData.phone !== undefined) update.phone = formData.phone
  if (formData.no_show_window_minutes !== undefined) update.no_show_window_minutes = formData.no_show_window_minutes
  if (formData.portfolio_photos !== undefined) {
    if (formData.portfolio_photos.length < 3) {
      return { data: null, error: 'Minimum 3 portfolio photos required' }
    }
    update.portfolio_photos = formData.portfolio_photos
  }

  if (formData.work_start_hour !== undefined && formData.work_end_hour !== undefined) {
    if (formData.work_start_hour >= formData.work_end_hour) {
      return { data: null, error: '營業開始時間必須早於結束時間' }
    }
    update.work_start_hour = formData.work_start_hour
    update.work_end_hour = formData.work_end_hour
  } else if (formData.work_start_hour !== undefined || formData.work_end_hour !== undefined) {
    return { data: null, error: '必須同時設定營業開始與結束時間' }
  }

  if (Object.keys(update).length === 0) {
    return { data: null, error: 'No fields to update' }
  }

  // Check if re-review fields changed
  if (formData.display_name !== undefined || formData.studio_address !== undefined) {
    const { data: current } = await supabase
      .from('pros')
      .select('display_name, studio_address')
      .eq('id', proId)
      .single()

    if (current) {
      const nameChanged = formData.display_name !== undefined && formData.display_name !== current.display_name
      const addressChanged = formData.studio_address !== undefined && formData.studio_address !== current.studio_address
      if (nameChanged || addressChanged) {
        update.is_approved = false
        update.verification_status = 'pending'
        update.submitted_at = new Date().toISOString()
        // Preserve rejection data on re-review — admin sees previous rejection reasons + application count
      }
    }
  }

  const { error } = await supabase
    .from('pros')
    .update(update)
    .eq('id', proId)

  revalidatePath('/pro/dashboard/settings')
  revalidatePath('/pro/dashboard')
  return { data: null, error: error?.message ?? null }
}

// ── Service actions ─────────────────────────────────────────

export async function toggleService(
  serviceId: string,
  isEnabled: boolean
): Promise<Result<null>> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('pro_services')
    .update({ is_enabled: isEnabled })
    .eq('id', serviceId)

  revalidatePath('/pro/dashboard/services')
  return { data: null, error: error?.message ?? null }
}

export async function updateServicePrice(
  serviceId: string,
  fields: {
    price_ntd?: number
    duration_minutes?: number
    addon_price_ntd?: number | null
    density_light_delta?: number | null
    density_daily_delta?: number | null
    density_heavy_delta?: number | null
    same_shop_14_price?: number | null
    same_shop_21_price?: number | null
    outside_shop_14_price?: number | null
    outside_shop_21_price?: number | null
  }
): Promise<Result<null>> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('pro_services')
    .update(fields)
    .eq('id', serviceId)

  revalidatePath('/pro/dashboard/services')
  return { data: null, error: error?.message ?? null }
}
