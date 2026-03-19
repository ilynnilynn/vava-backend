'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { setAccepting } from '@/lib/pros'
import { addSlot, removeSlot } from '@/lib/slots'
import { cancelBooking, completeBooking, markNoShow } from '@/lib/bookings'
import type { Result } from '@/types'

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
  revalidatePath('/dashboard')
  return result
}

// ── Slot actions ────────────────────────────────────────────

export async function addSlotAction(startsAt: string): Promise<Result<null>> {
  const proId = await getProId()
  if (!proId) return { data: null, error: 'Not authenticated' }

  const result = await addSlot(proId, startsAt)
  revalidatePath('/dashboard/slots')
  revalidatePath('/dashboard')
  return { data: null, error: result.error }
}

export async function removeSlotAction(slotId: string): Promise<Result<null>> {
  const result = await removeSlot(slotId)
  revalidatePath('/dashboard/slots')
  revalidatePath('/dashboard')
  return result
}

// ── Booking actions ─────────────────────────────────────────

export async function completeBookingAction(bookingId: string): Promise<Result<null>> {
  const result = await completeBooking(bookingId, true) // early = true (pro taps button)
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/history')
  return result
}

export async function markNoShowAction(bookingId: string): Promise<Result<null>> {
  const result = await markNoShow(bookingId, 'pro')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/history')
  return result
}

export async function cancelBookingAction(bookingId: string): Promise<Result<null>> {
  const result = await cancelBooking(bookingId, 'pro')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/history')
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
  no_show_window?: 10 | 15 | 20
  portfolio_photos?: string[]
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
  if (formData.no_show_window !== undefined) update.no_show_window = formData.no_show_window
  if (formData.portfolio_photos !== undefined) {
    if (formData.portfolio_photos.length < 3) {
      return { data: null, error: 'Minimum 3 portfolio photos required' }
    }
    update.portfolio_photos = formData.portfolio_photos
  }

  if (Object.keys(update).length === 0) {
    return { data: null, error: 'No fields to update' }
  }

  const { error } = await supabase
    .from('pros')
    .update(update)
    .eq('id', proId)

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard')
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

  revalidatePath('/dashboard/services')
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

  revalidatePath('/dashboard/services')
  return { data: null, error: error?.message ?? null }
}
