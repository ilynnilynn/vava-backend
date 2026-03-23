import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getAcceptingPros } from '@/lib/pros'
import { getProAvailableSlots } from '@/lib/slots'
import { getProAverageRating, getProPublicRatings } from '@/lib/ratings'
import ProCard from '@/components/search/ProCard'
import SearchFilters from '@/components/search/SearchFilters'
import Link from 'next/link'
import type { ServiceDomain } from '@/types/database'

type SearchParams = Promise<{
  domain?: string
  minPrice?: string
  maxPrice?: string
  q?: string
}>

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { domain, minPrice, maxPrice, q } = await searchParams

  // Validate domain param
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

  // Parse filter params
  const filterMinPrice = minPrice ? Number(minPrice) : null
  const filterMaxPrice = maxPrice ? Number(maxPrice) : null
  const locationQuery = q?.trim().toLowerCase() ?? ''

  // Get all accepting pros
  const allPros = await getAcceptingPros()

  // Find pros who have enabled services for this domain
  const supabase = await createClient()
  const { data: proServices } = await supabase
    .from('pro_services')
    .select('pro_id, price_ntd, category_id')
    .eq('is_enabled', true)

  // Get categories for this domain to filter
  const { data: categories } = await supabase
    .from('service_categories')
    .select('id')
    .eq('domain', validDomain)
    .eq('is_active', true)

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
  let matchingPros = allPros.filter(p => proServiceMap.has(p.id))

  // Apply location filter
  if (locationQuery) {
    matchingPros = matchingPros.filter(p =>
      p.studio_address.toLowerCase().includes(locationQuery)
    )
  }

  // Get slot counts for matching pros in parallel
  const prosWithSlots = await Promise.all(
    matchingPros.map(async (pro) => {
      const [slots, averageRating, publicRatings] = await Promise.all([
        getProAvailableSlots(pro.id),
        getProAverageRating(pro.id),
        getProPublicRatings(pro.id),
      ])
      return {
        pro,
        slotCount: slots.length,
        startingPrice: proServiceMap.get(pro.id)!.minPrice,
        averageRating,
        ratingCount: publicRatings.length,
      }
    })
  )

  // Only show pros with at least 1 available slot
  let visiblePros = prosWithSlots.filter(p => p.slotCount > 0)

  // Apply price filter
  if (filterMinPrice !== null) {
    visiblePros = visiblePros.filter(p => p.startingPrice >= filterMinPrice)
  }
  if (filterMaxPrice !== null) {
    visiblePros = visiblePros.filter(p => p.startingPrice <= filterMaxPrice)
  }

  const title = validDomain === 'nails' ? '美甲設計師' : '美睫設計師'

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-5 pt-12 pb-4">
        <Link href="/home" className="text-xs text-muted-foreground">
          ← 返回
        </Link>
        <h1 className="mt-2 text-xl font-bold text-foreground">{title}</h1>
        <p className="text-xs text-muted-foreground">
          {visiblePros.length > 0
            ? `${visiblePros.length} 位設計師可預約`
            : '搜尋中...'}
        </p>
      </header>

      {/* Filters */}
      <div className="px-5 pb-4">
        <Suspense fallback={null}>
          <SearchFilters />
        </Suspense>
      </div>

      {/* Results */}
      <div className="px-5 pb-12 space-y-3">
        {visiblePros.length === 0 ? (
          <div className="rounded-2xl bg-secondary px-5 py-8 text-center">
            <p className="text-sm font-medium text-foreground">
              目前沒有可預約的設計師
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              請稍後再試，或調整篩選條件
            </p>
          </div>
        ) : (
          visiblePros.map(({ pro, slotCount, startingPrice, averageRating, ratingCount }) => (
            <ProCard
              key={pro.id}
              proId={pro.id}
              displayName={pro.display_name}
              profilePhotoUrl={pro.profile_photo_url}
              studioAddress={pro.studio_address}
              availableSlotCount={slotCount}
              startingPrice={startingPrice}
              portfolioPhotos={pro.portfolio_photos ?? []}
              averageRating={averageRating}
              ratingCount={ratingCount}
            />
          ))
        )}
      </div>
    </main>
  )
}
