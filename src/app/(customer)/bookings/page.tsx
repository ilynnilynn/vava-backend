import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'
import { getCustomerBookings } from '@/lib/bookings'
import type { Booking, BookingStatus } from '@/types/database'

const STATUS_LABELS: Record<BookingStatus, string> = {
  confirmed: '已確認',
  reschedule_pending: '改期審核中',
  rescheduled: '已改期',
  cancelled_grace: '已取消',
  cancelled_customer: '已取消',
  cancelled_pro: '設計師取消',
  completed: '已完成',
  no_show_customer: '未出席',
  no_show_pro: '設計師未出席',
  expired: '已過期',
}

const STATUS_DOT: Record<string, string> = {
  confirmed: 'bg-success',
  reschedule_pending: 'bg-warning',
  rescheduled: 'bg-info',
  completed: 'bg-info',
  cancelled_grace: 'bg-muted-foreground',
  cancelled_customer: 'bg-destructive',
  cancelled_pro: 'bg-destructive',
  no_show_customer: 'bg-destructive',
  no_show_pro: 'bg-destructive',
  expired: 'bg-muted-foreground',
}

const UPCOMING_STATUSES = new Set<BookingStatus>(['confirmed', 'reschedule_pending'])

export default async function BookingsListPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const supabase = await createClient()

  const bookings = await getCustomerBookings(user.id, supabase)

  // Load pro names for all bookings
  const proIds = [...new Set(bookings.map(b => b.pro_id))]
  const { data: pros } = proIds.length > 0
    ? await supabase.from('pros').select('id, display_name').in('id', proIds)
    : { data: [] }
  const proMap = new Map((pros ?? []).map(p => [p.id, p.display_name]))

  // Load service category names
  const allCatIds = [...new Set(bookings.flatMap(b => b.service_category_ids))]
  const { data: cats } = allCatIds.length > 0
    ? await supabase.from('service_categories').select('id, name_zh').in('id', allCatIds)
    : { data: [] }
  const catMap = new Map((cats ?? []).map(c => [c.id, c.name_zh]))

  // Split into upcoming and past
  const upcoming = bookings.filter(b => UPCOMING_STATUSES.has(b.status))
  const past = bookings.filter(b => !UPCOMING_STATUSES.has(b.status))

  return (
    <main className="min-h-screen bg-background px-5 pt-12 pb-12">
      <h1 className="text-xl font-bold text-foreground mb-6">我的預約</h1>

      {bookings.length === 0 && (
        <div className="rounded-2xl bg-secondary px-5 py-8 text-center">
          <p className="text-sm font-medium text-foreground">還沒有預約紀錄</p>
          <p className="mt-1 text-xs text-muted-foreground">搜尋設計師開始預約</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">即將到來</h2>
          <div className="space-y-3">
            {upcoming.map(b => (
              <BookingCard
                key={b.id}
                booking={b}
                proName={proMap.get(b.pro_id) ?? '設計師'}
                serviceSummary={b.service_category_ids.map(id => catMap.get(id) ?? '').filter(Boolean).join(' + ')}
              />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">歷史紀錄</h2>
          <div className="space-y-3">
            {past.map(b => (
              <BookingCard
                key={b.id}
                booking={b}
                proName={proMap.get(b.pro_id) ?? '設計師'}
                serviceSummary={b.service_category_ids.map(id => catMap.get(id) ?? '').filter(Boolean).join(' + ')}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

function BookingCard({
  booking,
  proName,
  serviceSummary,
}: {
  booking: Booking
  proName: string
  serviceSummary: string
}) {
  const dateTime = new Date(booking.starts_at).toLocaleString('zh-TW', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <Link
      href={`/bookings/${booking.id}`}
      className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:border-foreground/20"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{proName}</p>
          <p className="text-xs text-muted-foreground">{dateTime}</p>
          <p className="text-xs text-muted-foreground">{serviceSummary}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${STATUS_DOT[booking.status] ?? 'bg-muted-foreground'}`} />
          <span className="text-xs text-muted-foreground">
            {STATUS_LABELS[booking.status] ?? booking.status}
          </span>
        </div>
      </div>
    </Link>
  )
}
