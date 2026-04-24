import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'
import { getProById } from '@/lib/pros'
import { getProAvailableSlots } from '@/lib/slots'
import { getFlagsForEntity, computeStanding } from '@/lib/flags'
import { getProAverageRating, getProPublicRatings } from '@/lib/ratings'
import BookingWizard from './BookingWizard'
import { Button } from '@/components/ui/button'
import type { ServiceCategory, ServiceStyleModifier, ProService, ProStanding } from '@/types/database'

type Params = Promise<{ proId: string }>

export default async function BookingPage({ params }: { params: Params }) {
  const { proId } = await params

  const pro = await getProById(proId)
  if (!pro || !pro.is_approved || !pro.is_accepting || pro.standing === 'suspended') {
    notFound()
  }

  const supabase = await createClient()

  // Auth — check customer standing
  const user = await getAuthUser()
  let customerStanding: ProStanding = 'good'
  if (user) {
    const flags = await getFlagsForEntity(user.id)
    customerStanding = computeStanding(flags)
  }

  // Suspended customers cannot book
  if (customerStanding === 'suspended') {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center px-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive-muted mb-6">
          <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">帳號已被暫停</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">
          因為多次違規，您的帳號已被暫停預約功能。如有疑問請聯繫客服。
        </p>
        <Button asChild className="h-14 w-full rounded-2xl text-base font-semibold">
          <Link href="/home">回到首頁</Link>
        </Button>
      </main>
    )
  }

  // Load data in parallel
  const [slots, proServicesRes, categoriesRes, styleModifiersRes, averageRating, publicRatings] = await Promise.all([
    getProAvailableSlots(proId),
    supabase
      .from('pro_services')
      .select('*')
      .eq('pro_id', proId)
      .eq('is_enabled', true),
    supabase
      .from('service_categories')
      .select('*')
      .eq('is_active', true),
    supabase
      .from('service_style_modifiers')
      .select('*')
      .eq('is_active', true),
    getProAverageRating(proId),
    getProPublicRatings(proId),
  ])

  const proServices: ProService[] = proServicesRes.data ?? []
  const categories: ServiceCategory[] = categoriesRes.data ?? []
  const styleModifiers: ServiceStyleModifier[] = styleModifiersRes.data ?? []

  // Determine domain from what services this pro offers
  const proCategoryIds = new Set(proServices.map(ps => ps.category_id))
  const proCategories = categories.filter(c => proCategoryIds.has(c.id))
  const domains = new Set(proCategories.map(c => c.domain))

  // For this MVP, pick the primary domain (nails or lashes)
  // If a pro does both, we default to nails — future: let customer pick
  const domain = domains.has('nails') ? 'nails' : 'lashes'

  return (
    <main className="min-h-screen bg-background">
      {(customerStanding === 'warning' || customerStanding === 'at_risk') && (
        <div className="mx-5 mt-4 rounded-xl border border-warning bg-warning-muted px-4 py-3">
          <p className="text-sm font-medium text-warning-foreground">
            {customerStanding === 'at_risk'
              ? '您的帳號狀態異常，再次違規將導致暫停。'
              : '您有違規紀錄，請注意遵守預約規則。'}
          </p>
        </div>
      )}
      <BookingWizard
        pro={{
          id: pro.id,
          displayName: pro.display_name,
          studioAddress: pro.studio_address,
          profilePhotoUrl: pro.profile_photo_url,
          noShowWindowMinutes: pro.no_show_window_minutes,
          portfolioPhotos: pro.portfolio_photos ?? [],
          averageRating,
          ratingCount: publicRatings.length,
        }}
        domain={domain}
        slots={slots}
        proServices={proServices}
        categories={categories}
        styleModifiers={styleModifiers}
      />
    </main>
  )
}
