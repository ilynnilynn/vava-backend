import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'
import { getBooking } from '@/lib/bookings'
import { Button } from '@/components/ui/button'
import BookingActions from './BookingActions'
import type { BookingStatus } from '@/types/database'

type Params = Promise<{ bookingId: string }>

const STATUS_LABELS: Record<BookingStatus, string> = {
  confirmed: '已確認',
  reschedule_pending: '改期審核中',
  rescheduled: '已改期',
  cancelled_grace: '已取消（免罰）',
  cancelled_customer: '已取消',
  cancelled_pro: '設計師取消',
  completed: '已完成',
  no_show_customer: '客戶未出席',
  no_show_pro: '設計師未出席',
  expired: '已過期',
}

const PREFERENCE_LABELS: Record<string, string> = {
  no_conversation: '靜默服務',
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-success-muted text-success-foreground',
  reschedule_pending: 'bg-warning-muted text-warning-foreground',
  rescheduled: 'bg-info-muted text-info-foreground',
  completed: 'bg-info-muted text-info-foreground',
  cancelled_grace: 'bg-secondary text-muted-foreground',
  cancelled_customer: 'bg-destructive-muted text-destructive',
  cancelled_pro: 'bg-destructive-muted text-destructive',
  no_show_customer: 'bg-destructive-muted text-destructive',
  no_show_pro: 'bg-destructive-muted text-destructive',
}

export default async function BookingDetailPage({
  params,
}: {
  params: Params
}) {
  const { bookingId } = await params
  const user = await getAuthUser()
  if (!user) notFound()

  const supabase = await createClient()

  const result = await getBooking(bookingId, supabase)
  if (result.error || !result.data) {
    notFound()
  }

  const booking = result.data

  // Verify the viewing user owns this booking
  if (booking.user_id !== user.id) {
    notFound()
  }

  // Load pro and service details
  const [proRes, categoriesRes] = await Promise.all([
    supabase
      .from('pros')
      .select('display_name, studio_address, phone')
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

  const isTerminal = [
    'cancelled_grace', 'cancelled_customer', 'cancelled_pro',
    'completed', 'no_show_customer', 'no_show_pro', 'expired',
  ].includes(booking.status)

  return (
    <main className="min-h-screen bg-background px-5 pt-12 pb-12">
      {/* Back nav */}
      <Link href="/bookings" className="text-xs text-muted-foreground">
        ← 我的預約
      </Link>

      {/* Status badge */}
      <div className="mt-4 mb-6">
        <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
          STATUS_COLORS[booking.status] ?? 'bg-secondary text-muted-foreground'
        }`}>
          {STATUS_LABELS[booking.status] ?? booking.status}
        </span>
      </div>

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

        {booking.preference && booking.preference.length > 0 && (
          <DetailRow label="偏好" value={booking.preference.map(p => PREFERENCE_LABELS[p] ?? p).join('、')} />
        )}
        {booking.customer_note && (
          <DetailRow label="備註" value={booking.customer_note} />
        )}

        <div className="border-t border-border pt-3 mt-3">
          <DetailRow label="預估費用" value={priceDisplay} bold />
        </div>
      </div>

      {/* Reference photo */}
      {booking.briefing_ref_photo_url && (
        <div className="mt-4">
          <p className="text-sm font-medium text-foreground mb-2">參考照片</p>
          <img
            src={booking.briefing_ref_photo_url}
            alt="參考照片"
            className="h-32 w-32 rounded-xl object-cover border border-border"
          />
        </div>
      )}

      {/* Actions — only for confirmed bookings */}
      {booking.status === 'confirmed' && (
        <div className="mt-6">
          <BookingActions
            bookingId={booking.id}
            createdAt={booking.created_at}
            startsAt={booking.starts_at}
            noShowWindowMinutes={booking.no_show_window_minutes}
            customerLateNotifiedAt={booking.customer_late_notified_at}
            proPhone={pro?.phone ?? null}
          />
        </div>
      )}

      {/* CTA */}
      <div className="mt-8">
        {isTerminal ? (
          <Button asChild className="h-14 w-full rounded-2xl text-base font-semibold">
            <Link href="/home">回到首頁</Link>
          </Button>
        ) : (
          <Button asChild variant="outline" className="h-14 w-full rounded-2xl text-base font-semibold">
            <Link href="/bookings">查看所有預約</Link>
          </Button>
        )}
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
