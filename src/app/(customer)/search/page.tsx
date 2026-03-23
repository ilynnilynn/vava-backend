// ============================================================
// /search — Results screen
//
// Receives wizard params from URL, fetches matching pros,
// passes full dataset to client for instant filtering.
// ============================================================

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAcceptingPros } from '@/lib/pros'
import { getProAvailableSlots } from '@/lib/slots'
import { getProAverageRating, getProPublicRatings } from '@/lib/ratings'
import { haversineKm } from '@/lib/geo'
import SearchResultsList from '@/components/search/SearchResultsList'
import type { ProResult } from '@/components/search/SearchResultsList'
import type { ServiceDomain } from '@/types/database'
import type { TimeBand } from '@/components/booking/FilteringWizard'

type SearchParams = Promise<{
  domain?: string
  lat?: string
  lng?: string
  date?: string
  timeBand?: string
  services?: string
  [key: string]: string | undefined
}>

function getTimeBandRange(band: TimeBand): { startHour: number; endHour: number } | null {
  switch (band) {
    case 'morning': return { startHour: 9, endHour: 12 }
    case 'afternoon': return { startHour: 12, endHour: 17 }
    case 'evening': return { startHour: 17, endHour: 22 }
    case 'any': return null
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const domain = params.domain

  if (domain !== 'nails' && domain !== 'lashes') {
    return (
      <main className="min-h-screen bg-background px-5 pt-12">
        <p className="text-sm text-muted-foreground">無效的服務類型</p>
        <Link href="/home" className="mt-4 inline-block text-sm font-medium underline">
          回到首頁
        </Link>
      </main>
    )
  }

  const validDomain: ServiceDomain = domain
  const userLat = params.lat ? parseFloat(params.lat) : null
  const userLng = params.lng ? parseFloat(params.lng) : null
  const timeBand = (params.timeBand ?? 'any') as TimeBand
  const timeBandRange = getTimeBandRange(timeBand)

  // Get all accepting pros
  const allPros = await getAcceptingPros()

  // Find pros who have enabled services for this domain
  const supabase = await createClient()
  const [{ data: proServices }, { data: categories }] = await Promise.all([
    supabase
      .from('pro_services')
      .select('pro_id, price_ntd, category_id')
      .eq('is_enabled', true),
    supabase
      .from('service_categories')
      .select('id')
      .eq('domain', validDomain)
      .eq('is_active', true),
  ])

  const domainCategoryIds = new Set((categories ?? []).map(c => c.id))

  // Build a map: proId -> { minPrice }
  const proServiceMap = new Map<string, { minPrice: number }>()
  for (const ps of proServices ?? []) {
    if (!domainCategoryIds.has(ps.category_id)) continue
    if (ps.price_ntd == null) continue
    const existing = proServiceMap.get(ps.pro_id)
    if (!existing || ps.price_ntd < existing.minPrice) {
      proServiceMap.set(ps.pro_id, { minPrice: ps.price_ntd })
    }
  }

  // Filter pros to those who have services in this domain
  const matchingPros = allPros.filter(p => proServiceMap.has(p.id))

  // Get slots + ratings + distance for matching pros in parallel
  const prosWithData = await Promise.all(
    matchingPros.map(async (pro) => {
      const [allSlots, averageRating, publicRatings] = await Promise.all([
        getProAvailableSlots(pro.id),
        getProAverageRating(pro.id),
        getProPublicRatings(pro.id),
      ])

      // Filter slots by time band if specified
      const slots = timeBandRange
        ? allSlots.filter(s => {
            const h = new Date(s.starts_at).getUTCHours()
            return h >= timeBandRange.startHour && h < timeBandRange.endHour
          })
        : allSlots

      // Compute distance
      const distanceKm =
        userLat !== null && userLng !== null && pro.studio_lat != null && pro.studio_lng != null
          ? haversineKm(userLat, userLng, pro.studio_lat, pro.studio_lng)
          : null

      // Extract district from studio_address (first segment before 區)
      const districtMatch = pro.studio_address.match(/(.+?區)/)
      const district = districtMatch ? districtMatch[1] : ''

      return {
        proId: pro.id,
        displayName: pro.display_name,
        profilePhotoUrl: pro.profile_photo_url,
        studioAddress: pro.studio_address,
        district,
        distanceKm,
        studioLat: pro.studio_lat ?? null,
        studioLng: pro.studio_lng ?? null,
        availableSlotCount: slots.length,
        slots: slots.map(s => ({
          id: s.id,
          startsAt: s.starts_at,
          durationMinutes: s.ends_at
            ? Math.round((new Date(s.ends_at).getTime() - new Date(s.starts_at).getTime()) / 60000)
            : 60, // default 60 min if ends_at not set
        })),
        startingPrice: proServiceMap.get(pro.id)!.minPrice,
        portfolioPhotos: pro.portfolio_photos ?? [],
        averageRating,
        ratingCount: publicRatings.length,
      }
    })
  )

  // Only show pros with at least 1 available slot
  const visiblePros = prosWithData.filter(p => p.availableSlotCount > 0)

  // Sort: closest distance → soonest slot
  const sortedPros = [...visiblePros].sort((a, b) => {
    const distA = a.distanceKm ?? Infinity
    const distB = b.distanceKm ?? Infinity
    if (distA !== distB) return distA - distB
    // Soonest available slot as tiebreaker
    const slotA = a.slots[0]?.startsAt ?? ''
    const slotB = b.slots[0]?.startsAt ?? ''
    return slotA.localeCompare(slotB)
  })

  // Fallback tiers
  let fallbackTier: 'exact' | 'closest' | 'none' = 'exact'
  let fallbackPros: ProResult[] = []

  if (sortedPros.length === 0) {
    // Try closest fit: all pros with slots (no distance/time filter)
    const closestFit = prosWithData.filter(p => p.availableSlotCount > 0)
    if (closestFit.length > 0) {
      fallbackTier = 'closest'
      fallbackPros = closestFit
    } else {
      // Show any pros with open slots
      fallbackTier = 'none'
      // prosWithData already includes all matching-domain pros;
      // allSlots check already done above
    }
  }

  const title = validDomain === 'nails' ? '美甲設計師' : '美睫設計師'
  const wizardParams = new URLSearchParams(params as Record<string, string>).toString()

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-5 pt-12 pb-4">
        <Link href="/home" className="text-xs text-muted-foreground">
          ← 返回
        </Link>
        <h1 className="mt-2 text-xl font-bold text-foreground">{title}</h1>
      </header>

      {/* Client-side filters + results */}
      <SearchResultsList
        pros={sortedPros.length > 0 ? sortedPros : fallbackPros}
        fallbackTier={fallbackTier}
        hasUserLocation={userLat !== null}
        userLat={userLat}
        userLng={userLng}
        wizardParams={wizardParams}
      />
    </main>
  )
}
