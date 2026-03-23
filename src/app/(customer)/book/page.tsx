// ============================================================
// /book — Filtering form wizard entry point
//
// Customer lands here after tapping 美甲 or 美睫 on home.
// Reads ?domain=nails|lashes, renders the step-by-step wizard.
// ============================================================

import Link from 'next/link'
import FilteringWizard from '@/components/booking/FilteringWizard'
import type { ServiceDomain } from '@/types/database'

type SearchParams = Promise<{
  domain?: string
}>

export default async function BookPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { domain } = await searchParams

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

  return <FilteringWizard domain={validDomain} />
}
