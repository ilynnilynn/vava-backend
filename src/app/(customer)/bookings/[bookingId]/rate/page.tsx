import Link from 'next/link'
import { verifyRatingToken, getAuthUser } from '@/lib/auth'
import { getBooking } from '@/lib/bookings'
import { getRatingForBooking } from '@/lib/ratings'
import { createClient } from '@/lib/supabase/server'
import RatingForm from './RatingForm'

type Params = Promise<{ bookingId: string }>
type SearchParams = Promise<{ token?: string }>

export default async function RatePage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const { bookingId } = await params
  const { token } = await searchParams

  // ── Verify token ─────────────────────────────────────────
  if (!token) {
    return <ErrorScreen message="缺少評價連結" />
  }

  let tokenPayload: { bookingId: string; userId: string }
  try {
    tokenPayload = verifyRatingToken(token)
  } catch {
    return <ErrorScreen message="評價連結無效或已過期" />
  }

  // Token bookingId must match URL bookingId
  if (tokenPayload.bookingId !== bookingId) {
    return <ErrorScreen message="評價連結無效" />
  }

  // ── Load booking + pro info ──────────────────────────────
  await getAuthUser() // validate session (cached, no extra HTTP call)
  const supabase = await createClient()

  const bookingResult = await getBooking(bookingId, supabase)
  if (bookingResult.error || !bookingResult.data) {
    return <ErrorScreen message="找不到此預約" />
  }

  const booking = bookingResult.data

  if (booking.user_id !== tokenPayload.userId) {
    return <ErrorScreen message="評價連結無效" />
  }

  if (booking.status !== 'completed') {
    return <ErrorScreen message="此預約尚未完成，無法評價" />
  }

  // ── Check already rated ──────────────────────────────────
  const existingRating = await getRatingForBooking(bookingId, 'customer')

  // ── Load pro display name ────────────────────────────────
  const { data: pro } = await supabase
    .from('pros')
    .select('display_name')
    .eq('id', booking.pro_id)
    .single()

  const proName = pro?.display_name ?? '設計師'

  // ── Already rated → show result ──────────────────────────
  if (existingRating) {
    return (
      <main className="min-h-screen bg-background px-5 pt-12 pb-12">
        <h1 className="text-xl font-bold text-foreground">已評價</h1>
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 space-y-3">
          <p className="text-sm text-muted-foreground">您已為 {proName} 留下評價</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <span
                key={s}
                className={`text-2xl ${s <= existingRating.stars ? 'text-star' : 'text-border'}`}
              >
                ★
              </span>
            ))}
          </div>
          {existingRating.comment && (
            <p className="text-sm text-foreground">{existingRating.comment}</p>
          )}
        </div>
        <Link
          href="/bookings"
          className="mt-8 inline-block text-sm font-medium text-foreground underline"
        >
          查看所有預約
        </Link>
      </main>
    )
  }

  // ── Show rating form ─────────────────────────────────────
  return (
    <main className="min-h-screen bg-background px-5 pt-12 pb-12">
      <Link href="/bookings" className="text-xs text-muted-foreground">
        ← 我的預約
      </Link>
      <h1 className="mt-4 text-xl font-bold text-foreground">評價 {proName}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        感謝您的光臨！請為此次服務評分
      </p>
      <RatingForm token={token} />
    </main>
  )
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-5">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive-muted mb-6">
        <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <p className="text-base font-medium text-foreground text-center">{message}</p>
      <Link
        href="/bookings"
        className="mt-6 text-sm font-medium text-foreground underline"
      >
        回到預約列表
      </Link>
    </main>
  )
}
