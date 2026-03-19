import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getBooking } from '@/lib/bookings'
import { Button } from '@/components/ui/button'

type Params = Promise<{ bookingId: string }>

export default async function BookingConfirmationPage({
  params,
}: {
  params: Params
}) {
  const { bookingId } = await params
  const result = await getBooking(bookingId)

  if (result.error || !result.data) {
    notFound()
  }

  const booking = result.data
  const supabase = await createClient()

  // Load pro and service details
  const [proRes, categoriesRes] = await Promise.all([
    supabase
      .from('pros')
      .select('display_name, studio_address')
      .eq('id', booking.pro_id)
      .single(),
    supabase
      .from('service_categories')
      .select('name_zh')
      .in('id', booking.service_category_ids),
  ])

  const pro = proRes.data
  const serviceSummary =
    categoriesRes.data?.map(c => c.name_zh).join(' + ') ?? '服務'

  const dateTime = new Date(booking.starts_at).toLocaleString('zh-TW', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  const priceDisplay =
    booking.price_min === booking.price_max
      ? `NT$${booking.price_min.toLocaleString()}`
      : `NT$${booking.price_min.toLocaleString()} – ${booking.price_max.toLocaleString()}`

  return (
    <main className="min-h-screen bg-background px-5 pt-16 pb-12">
      {/* Success icon */}
      <div className="flex justify-center mb-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>
      </div>

      <h1 className="text-center text-xl font-bold text-foreground mb-1">
        預約成功！
      </h1>
      <p className="text-center text-sm text-muted-foreground mb-8">
        設計師將收到通知
      </p>

      {/* Booking details */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        {pro && (
          <>
            <DetailRow label="設計師" value={pro.display_name} />
            <DetailRow label="地址" value={pro.studio_address} />
          </>
        )}
        <DetailRow label="時間" value={dateTime} />
        <DetailRow label="服務" value={serviceSummary} />
        <div className="border-t border-border pt-3 mt-3">
          <DetailRow label="預估費用" value={priceDisplay} bold />
        </div>
      </div>

      {/* CTA */}
      <div className="mt-8">
        <Button asChild className="h-14 w-full rounded-2xl text-base font-semibold">
          <Link href="/home">回到首頁</Link>
        </Button>
      </div>
    </main>
  )
}

function DetailRow({
  label,
  value,
  bold,
}: {
  label: string
  value: string
  bold?: boolean
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-foreground ${bold ? 'font-semibold' : ''}`}>
        {value}
      </span>
    </div>
  )
}
