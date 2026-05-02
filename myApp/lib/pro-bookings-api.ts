// lib/pro-bookings-api.ts
import { supabase } from './supabase'
import type { ProBookingListItem } from '@/types/pro'

// starts_at lives on slots, not on bookings. PostgREST may return the
// FK relation as an object or array — handle both.
function slotStartsAt(slots: unknown): string {
  if (!slots) return ''
  if (Array.isArray(slots)) return (slots[0] as any)?.starts_at ?? ''
  return (slots as any).starts_at ?? ''
}

export async function fetchProBookings(): Promise<ProBookingListItem[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  // Get this user's pro record
  const { data: pro } = await supabase
    .from('pros')
    .select('id')
    .eq('user_id', session.user.id)
    .single()
  if (!pro) return []

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, service_category_ids, slots!slot_id(starts_at), session_ends_at, status, users!inner(display_name)')
    .eq('pro_id', pro.id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error
  if (!bookings?.length) return []

  // Batch-fetch categories for domain + label
  const allCatIds = [...new Set((bookings as any[]).flatMap((b) => b.service_category_ids as string[]))]
  const { data: cats } = await supabase
    .from('service_categories')
    .select('id, domain, name_zh')
    .in('id', allCatIds)

  const catMap = new Map((cats ?? []).map((c: any) => [c.id as string, c]))

  return (bookings as any[]).map((b) => {
    const firstCat = catMap.get(b.service_category_ids[0]) as any
    const service_label = (b.service_category_ids as string[])
      .map((id) => (catMap.get(id) as any)?.name_zh ?? '')
      .filter(Boolean)
      .join(' · ')

    return {
      id: b.id as string,
      client_display_name: (b.users.display_name as string) ?? '顧客',
      service_domain: (firstCat?.domain ?? 'nails') as 'nails' | 'lashes',
      service_label,
      starts_at: slotStartsAt(b.slots),
      ends_at: (b.session_ends_at as string) ?? slotStartsAt(b.slots),
      status: b.status,
    }
  })
}

export async function markBookingComplete(bookingId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', bookingId)

  if (error) throw error
}

export async function markBookingNoShow(bookingId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'no_show_customer',
      no_show_reported_at: new Date().toISOString(),
      no_show_reporter: 'pro',
    })
    .eq('id', bookingId)

  if (error) throw error
}
