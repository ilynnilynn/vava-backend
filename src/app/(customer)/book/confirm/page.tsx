// ============================================================
// /book/confirm — Confirm booking screen
//
// Shows summary of selected pro + slot + service, CTA to confirm.
// Server component fetches pro and calculates price.
// ============================================================

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProById } from '@/lib/pros'
import ConfirmClient from '@/components/booking/ConfirmClient'

type SearchParams = Promise<{
  proId?: string
  slotId?: string
  startsAt?: string
  durationMinutes?: string
  domain?: string
  services?: string
  [key: string]: string | undefined
}>

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const { proId, slotId, startsAt, durationMinutes } = params

  if (!proId || !slotId || !startsAt || !durationMinutes) {
    return (
      <main className="min-h-screen bg-background px-5 pt-12">
        <p className="text-sm text-muted-foreground">缺少預約資訊</p>
        <Link href="/home" className="mt-4 inline-block text-sm font-medium underline">
          回到首頁
        </Link>
      </main>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const pro = await getProById(proId)
  if (!pro) {
    return (
      <main className="min-h-screen bg-background px-5 pt-12">
        <p className="text-sm text-muted-foreground">找不到設計師</p>
        <Link href="/home" className="mt-4 inline-block text-sm font-medium underline">
          回到首頁
        </Link>
      </main>
    )
  }

  // Get service category names for display
  const serviceIds = params.services?.split(',') ?? []
  let serviceSummary = ''
  if (serviceIds.length > 0) {
    const { data: categories } = await supabase
      .from('service_categories')
      .select('id, name_zh')
      .in('id', serviceIds)
    serviceSummary = (categories ?? []).map(c => c.name_zh).join(' · ')
  }

  // Get starting price
  const { data: proServices } = await supabase
    .from('pro_services')
    .select('price_ntd')
    .eq('pro_id', proId)
    .eq('is_enabled', true)
    .order('price_ntd', { ascending: true })
    .limit(1)

  const startingPrice = proServices?.[0]?.price_ntd ?? 0

  // Format date/time
  const dt = new Date(startsAt)
  const dateTime = `${dt.getMonth() + 1}月${dt.getDate()}日 ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`

  return (
    <ConfirmClient
      proId={proId}
      proName={pro.display_name}
      studioAddress={pro.studio_address}
      slotId={slotId}
      startsAt={startsAt}
      durationMinutes={parseInt(durationMinutes, 10)}
      noShowWindowMinutes={pro.no_show_window_minutes ?? 15}
      serviceSummary={serviceSummary}
      serviceIds={serviceIds}
      startingPrice={startingPrice}
      dateTime={dateTime}
      wizardParams={params}
    />
  )
}
