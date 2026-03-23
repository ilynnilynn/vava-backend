// ============================================================
// /book/success — Booking confirmed screen
//
// Shows success message + grace period cancel option.
// ============================================================

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBooking } from '@/lib/bookings'
import SuccessClient from './SuccessClient'

type SearchParams = Promise<{
  bookingId?: string
}>

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { bookingId } = await searchParams

  if (!bookingId) {
    return (
      <main className="min-h-screen bg-background px-5 pt-12">
        <p className="text-sm text-muted-foreground">找不到預約</p>
        <Link href="/home" className="mt-4 inline-block text-sm font-medium underline">
          回到首頁
        </Link>
      </main>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: booking } = await getBooking(bookingId)
  if (!booking || booking.user_id !== user.id) {
    return (
      <main className="min-h-screen bg-background px-5 pt-12">
        <p className="text-sm text-muted-foreground">找不到預約</p>
        <Link href="/home" className="mt-4 inline-block text-sm font-medium underline">
          回到首頁
        </Link>
      </main>
    )
  }

  // Fetch pro + service info
  const [{ data: pro }, { data: categories }] = await Promise.all([
    supabase.from('pros').select('display_name, studio_address').eq('id', booking.pro_id).single(),
    supabase.from('service_categories').select('name_zh').in('id', booking.service_category_ids),
  ])

  const serviceSummary = (categories ?? []).map(c => c.name_zh).join(' · ')
  const dt = new Date(booking.starts_at)
  const dateTime = `${dt.getMonth() + 1}月${dt.getDate()}日 ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`

  return (
    <SuccessClient
      bookingId={bookingId}
      proName={pro?.display_name ?? '設計師'}
      studioAddress={pro?.studio_address ?? ''}
      serviceSummary={serviceSummary}
      dateTime={dateTime}
      createdAt={booking.created_at}
    />
  )
}
