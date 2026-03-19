import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProBookings } from '@/lib/bookings'
import { HistoryList } from './HistoryList'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/pro/login')

  const { data: pro } = await supabase
    .from('pros')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!pro) redirect('/pro/login')

  const bookings = await getProBookings(pro.id)

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="text-xl font-bold">預約紀錄</h1>
        <p className="text-sm text-muted-foreground">
          所有預約的完整記錄
        </p>
      </div>

      <HistoryList bookings={bookings} />
    </div>
  )
}
