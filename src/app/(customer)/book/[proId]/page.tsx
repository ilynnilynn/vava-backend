import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProById } from '@/lib/pros'
import { getProAvailableSlots } from '@/lib/slots'
import BookingWizard from './BookingWizard'
import type { ServiceCategory, ServiceStyleModifier, ProService } from '@/types/database'

type Params = Promise<{ proId: string }>

export default async function BookingPage({ params }: { params: Params }) {
  const { proId } = await params

  const pro = await getProById(proId)
  if (!pro || !pro.is_approved || !pro.is_accepting || pro.standing === 'suspended') {
    notFound()
  }

  const supabase = await createClient()

  // Load data in parallel
  const [slots, proServicesRes, categoriesRes, styleModifiersRes] = await Promise.all([
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
      <BookingWizard
        pro={{
          id: pro.id,
          displayName: pro.display_name,
          studioAddress: pro.studio_address,
          profilePhotoUrl: pro.profile_photo_url,
          noShowWindowMinutes: pro.no_show_window_minutes,
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
