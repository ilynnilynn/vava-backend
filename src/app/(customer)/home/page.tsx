// ============================================================
// /home — Customer home screen
//
// Entry point after login + onboarding.
// State A: no upcoming bookings → 美甲/美睫 CTA only
// State B: has upcoming bookings → cards sorted soonest first, CTA below
//
// Server component — reads user + upcoming bookings from Supabase.
// ============================================================

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCustomerBookings } from '@/lib/bookings'
import HomeClient from './HomeClient'
import type { UpcomingBooking } from './HomeClient'
import type { Booking } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('phone, birth_year')
    .eq('id', user.id)
    .single()

  // Guard: if onboarding not complete, send them back
  if (!userData?.phone || !userData?.birth_year) {
    redirect('/onboarding')
  }

  // Get display name from auth metadata
  const meta = user.user_metadata ?? {}
  const firstName = (meta.name as string)?.split(' ')[0] ?? '你好'

  // Fetch upcoming confirmed bookings within 72hr window
  const allBookings = await getCustomerBookings(user.id)
  const upcomingBookings = filterUpcomingBookings(allBookings)
  const enrichedBookings = await enrichBookings(upcomingBookings, supabase)

  return <HomeClient firstName={firstName} upcomingBookings={enrichedBookings} />
}

function filterUpcomingBookings(bookings: Booking[]) {
  const now = Date.now()
  const windowMs = 72 * 60 * 60 * 1000
  return bookings
    .filter(b =>
      b.status === 'confirmed' &&
      new Date(b.starts_at).getTime() > now &&
      new Date(b.starts_at).getTime() - now <= windowMs
    )
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
}

async function enrichBookings(
  bookings: Booking[],
  supabase: SupabaseClient,
): Promise<UpcomingBooking[]> {
  if (bookings.length === 0) return []

  const proIds = [...new Set(bookings.map(b => b.pro_id))]
  const categoryIds = [...new Set(bookings.flatMap(b => b.service_category_ids))]

  const [{ data: pros }, { data: categories }] = await Promise.all([
    supabase.from('pros').select('id, display_name, studio_address').in('id', proIds),
    supabase.from('service_categories').select('id, name_zh').in('id', categoryIds),
  ])

  const proMap = new Map((pros ?? []).map(p => [p.id, p]))
  const catMap = new Map((categories ?? []).map(c => [c.id, c.name_zh]))

  return bookings.map(b => ({
    id: b.id,
    startsAt: b.starts_at,
    sessionEndsAt: b.session_ends_at,
    proName: proMap.get(b.pro_id)?.display_name ?? '設計師',
    studioAddress: proMap.get(b.pro_id)?.studio_address ?? '',
    serviceSummary: b.service_category_ids.map(id => catMap.get(id) ?? '').filter(Boolean).join(' · '),
  }))
}
