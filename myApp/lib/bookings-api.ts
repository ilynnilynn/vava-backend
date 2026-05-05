// lib/bookings-api.ts
import { supabase } from './supabase'
import type { BookingListItem, BookingDetail } from '@/types/booking-list'

// PostgREST returns slots as object (forward FK) but can return array if relationship is ambiguous.
// This helper handles both cases safely.
function slotStartsAt(slots: unknown): string {
  if (!slots) return ''
  if (Array.isArray(slots)) return (slots[0] as any)?.starts_at ?? ''
  return (slots as any).starts_at ?? ''
}

export async function fetchBookings(): Promise<BookingListItem[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  // starts_at lives on slots — use slot_id hint to disambiguate from proposed_slot_id
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, service_category_ids, status, slots!slot_id(starts_at), pros!inner(display_name)')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[fetchBookings] query error:', error)
    throw error
  }
  if (!bookings?.length) return []

  // Batch-fetch categories for domain lookup
  const allCatIds = [...new Set((bookings as any[]).flatMap((b) => b.service_category_ids as string[]))]
  if (!allCatIds.length) return (bookings as any[]).map((b) => ({
    id: b.id as string,
    pro_display_name: b.pros.display_name as string,
    service_domain: 'nails' as const,
    starts_at: slotStartsAt(b.slots),
    status: b.status,
  }))

  const { data: cats } = await supabase
    .from('service_categories')
    .select('id, domain')
    .in('id', allCatIds)

  const catMap = new Map((cats ?? []).map((c: any) => [c.id as string, c.domain as string]))

  return (bookings as any[]).map((b) => ({
    id: b.id as string,
    pro_display_name: b.pros.display_name as string,
    service_domain: (catMap.get(b.service_category_ids[0]) ?? 'nails') as 'nails' | 'lashes',
    starts_at: slotStartsAt(b.slots),
    status: b.status,
  }))
}

export async function fetchBookingDetail(bookingId: string): Promise<BookingDetail> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { data: b, error } = await supabase
    .from('bookings')
    .select(`
      id, service_category_ids, session_ends_at,
      price_min, price_max, status, no_show_window_minutes,
      customer_late_notified_at, created_at,
      slots!slot_id(starts_at),
      pros!inner(display_name, phone, studio_address)
    `)
    .eq('id', bookingId)
    .eq('user_id', session.user.id)
    .single()

  if (error) throw error

  const catIds = (b as any).service_category_ids as string[]
  const { data: cats } = await supabase
    .from('service_categories')
    .select('id, domain, name_zh')
    .in('id', catIds)

  const catMap = new Map((cats ?? []).map((c: any) => [c.id as string, c]))
  const service_label = catIds
    .map((id) => (catMap.get(id) as any)?.name_zh ?? '')
    .filter(Boolean)
    .join(' · ')
  const firstCat = catMap.get(catIds[0]) as any

  const pros = (b as any).pros

  return {
    id: b.id,
    pro_display_name: pros.display_name,
    pro_phone: pros.phone ?? null,
    service_domain: firstCat?.domain ?? 'nails',
    service_label,
    starts_at: slotStartsAt((b as any).slots),
    session_ends_at: (b as any).session_ends_at,
    studio_address: pros.studio_address ?? '',
    price_min: (b as any).price_min,
    price_max: (b as any).price_max,
    status: b.status,
    no_show_window_minutes: (b as any).no_show_window_minutes,
    customer_late_notified_at: (b as any).customer_late_notified_at ?? null,
    created_at: b.created_at,
  }
}
