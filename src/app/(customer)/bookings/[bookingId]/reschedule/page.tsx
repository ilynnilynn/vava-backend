import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'
import { getBooking } from '@/lib/bookings'
import { getProAvailableSlots } from '@/lib/slots'
import RescheduleSlotPicker from './RescheduleSlotPicker'

type Params = Promise<{ bookingId: string }>

export default async function ReschedulePage({
  params,
}: {
  params: Params
}) {
  const { bookingId } = await params
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const supabase = await createClient()

  // Load booking
  const result = await getBooking(bookingId, supabase)
  if (result.error || !result.data) notFound()

  const booking = result.data

  // Verify ownership
  if (booking.user_id !== user.id) notFound()

  // Must be confirmed
  if (booking.status !== 'confirmed') {
    redirect(`/bookings/${bookingId}`)
  }

  // Must be > 2hr away
  const now = new Date()
  const minutesUntil = (new Date(booking.starts_at).getTime() - now.getTime()) / 60000
  if (minutesUntil < 120) {
    redirect(`/bookings/${bookingId}`)
  }

  // Get pro's available slots (exclude the current slot)
  const availableSlots = (await getProAvailableSlots(booking.pro_id))
    .filter(s => s.id !== booking.slot_id)

  // Load pro name
  const { data: pro } = await supabase
    .from('pros')
    .select('display_name')
    .eq('id', booking.pro_id)
    .single()

  return (
    <main className="min-h-screen bg-background px-5 pt-12 pb-12">
      <Link href={`/bookings/${bookingId}`} className="text-xs text-muted-foreground">
        ← 返回預約詳情
      </Link>

      <h1 className="mt-4 text-xl font-bold text-foreground">申請改期</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {pro?.display_name ?? '設計師'} 將在 6 小時內回覆
      </p>

      <div className="mt-6">
        <RescheduleSlotPicker bookingId={bookingId} slots={availableSlots} />
      </div>
    </main>
  )
}
