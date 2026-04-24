// ============================================================
// /home — Customer home screen (server component)
//
// Fetches:
//   1. Auth + onboarding guard
//   2. Upcoming confirmed bookings (72hr window)
//   3. Live pro counts per category (for "現在有空" section)
// ============================================================

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'
import { getCustomerBookings } from '@/lib/bookings'
import HomeClient from './HomeClient'
import type { UpcomingBooking, ProCounts } from './HomeClient'
import type { Booking } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

export default async function HomePage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const supabase = await createClient()

  const { data: userData } = await supabase
    .from('users')
    .select('phone, birth_year')
    .eq('id', user.id)
    .single()

  if (!userData?.phone || !userData?.birth_year) {
    redirect('/onboarding')
  }

  // ── Fetch data in parallel ──────────────────────────────────────────────────
  const [allBookings, proCounts] = await Promise.all([
    getCustomerBookings(user.id, supabase),
    fetchProCounts(supabase),
  ])

  const upcomingBookings = await enrichBookings(
    filterUpcomingBookings(allBookings),
    supabase,
  )

  return (
    <HomeClient
      upcomingBookings={upcomingBookings}
      proCounts={proCounts}
    />
  )
}

// ── Pro counts per category ─────────────────────────────────────────────────
//
// Counts active pros offering each service category.
// TODO: filter by district once pros store a location field.
// TODO: filter by real-time availability once pros have an "available" toggle.

async function fetchProCounts(supabase: SupabaseClient): Promise<ProCounts> {
  try {
    const { data: categories } = await supabase
      .from('service_categories')
      .select('id, name_zh')
      .in('name_zh', ['美甲', '美睫', '美妝'])

    if (!categories || categories.length === 0) {
      return { nails: 0, lashes: 0, makeup: 0 }
    }

    const catMap = new Map(categories.map(c => [c.name_zh, c.id]))
    const nailsId  = catMap.get('美甲')
    const lashesId = catMap.get('美睫')
    const makeupId = catMap.get('美妝')

    const [nailsRes, lashesRes, makeupRes] = await Promise.all([
      nailsId  ? supabase.from('pros').select('id', { count: 'exact', head: true }).contains('service_category_ids', [nailsId])  : { count: 0 },
      lashesId ? supabase.from('pros').select('id', { count: 'exact', head: true }).contains('service_category_ids', [lashesId]) : { count: 0 },
      makeupId ? supabase.from('pros').select('id', { count: 'exact', head: true }).contains('service_category_ids', [makeupId]) : { count: 0 },
    ])

    return {
      nails:  nailsRes.count  ?? 0,
      lashes: lashesRes.count ?? 0,
      makeup: makeupRes.count ?? 0,
    }
  } catch {
    return { nails: 0, lashes: 0, makeup: 0 }
  }
}

// ── Booking helpers ─────────────────────────────────────────────────────────

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
