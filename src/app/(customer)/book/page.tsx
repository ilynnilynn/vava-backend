// ============================================================
// /book — Filtering form wizard entry point
//
// Customer lands here after tapping 美甲 or 美睫 on home.
// Reads ?domain=nails|lashes, renders the step-by-step wizard.
// ============================================================

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import FilteringWizard from '@/components/booking/FilteringWizard'
import type { WizardState, TimeBand, DateOption } from '@/components/booking/FilteringWizard'
import type { ServiceDomain, ServiceCategory, ServiceStyleModifier, LashSpecialFiberTag } from '@/types/database'

type SearchParams = Promise<{
  domain?: string
  lat?: string
  lng?: string
  locationLabel?: string
  dates?: string
  timeBand?: string
  services?: string
  treatmentTier?: string
  styleId?: string
  addons?: string
  lashRemoval?: string
  fillInDays?: string
  directionId?: string
  density?: string
  styleTags?: string
  fiberTagId?: string
  silent?: string
  note?: string
  refPhoto?: string
  [key: string]: string | undefined
}>

function parseInitialValues(
  params: Awaited<SearchParams>,
  domain: ServiceDomain,
): Partial<WizardState> | undefined {
  // Only build overrides if any core wizard param exists beyond domain
  if (!params.lat && !params.dates && !params.services) return undefined

  const vals: Partial<WizardState> = {}

  if (params.lat) vals.lat = parseFloat(params.lat)
  if (params.lng) vals.lng = parseFloat(params.lng)
  if (params.locationLabel) vals.locationLabel = params.locationLabel
  if (params.dates) vals.dates = params.dates.split(',') as DateOption[]
  if (params.timeBand) vals.timeBand = params.timeBand as TimeBand

  if (domain === 'nails') {
    if (params.services) vals.nailServices = params.services.split(',')
    if (params.treatmentTier) vals.treatmentTier = params.treatmentTier as 'basic' | 'deep'
    if (params.styleId) vals.nailStyleId = params.styleId
    if (params.addons) vals.nailAddons = params.addons.split(',')
  } else {
    if (params.services) vals.lashService = params.services.split(',')[0]
    if (params.lashRemoval === '1') vals.lashRemovalAdded = true
    if (params.fillInDays) vals.fillInDays = parseInt(params.fillInDays, 10)
    if (params.directionId) vals.lashDirectionId = params.directionId
    if (params.density) vals.lashDensity = params.density
    if (params.styleTags) vals.lashStyleTags = params.styleTags.split(',')
    if (params.fiberTagId) vals.lashFiberTagId = params.fiberTagId
    if (params.addons) vals.lashAddons = params.addons.split(',')
  }

  if (params.silent === '1') vals.silentPreference = true
  if (params.note) vals.customerNote = params.note
  if (params.refPhoto) vals.refPhotoUrl = params.refPhoto

  return vals
}

export default async function BookPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const { domain } = params

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
  const initialValues = parseInitialValues(params, validDomain)

  const supabase = await createClient()

  const [categoriesRes, styleModifiersRes, fiberTagsRes] = await Promise.all([
    supabase.from('service_categories').select('*').eq('is_active', true),
    supabase.from('service_style_modifiers').select('*').eq('is_active', true),
    supabase.from('lash_special_fiber_tags').select('*').eq('is_active', true),
  ])

  const allCategories: ServiceCategory[] = categoriesRes.data ?? []
  const categories = allCategories.filter(c => c.domain === validDomain)
  const styleModifiers: ServiceStyleModifier[] = (styleModifiersRes.data ?? []).filter(
    (s: ServiceStyleModifier) => s.service_type === validDomain
  )
  const fiberTags: LashSpecialFiberTag[] = fiberTagsRes.data ?? []

  return (
    <FilteringWizard
      domain={validDomain}
      categories={categories}
      styleModifiers={styleModifiers}
      fiberTags={fiberTags}
      initialValues={initialValues}
    />
  )
}
