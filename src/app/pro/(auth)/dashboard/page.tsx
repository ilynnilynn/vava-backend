import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProBookings } from '@/lib/bookings'
import { HomeContent } from './HomeContent'

export default async function DashboardHome() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/pro/login')

  const { data: pro } = await supabase
    .from('pros')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!pro) redirect('/pro/login')

  const allBookings = await getProBookings(pro.id)

  return <HomeContent pro={pro} bookings={allBookings} />
}
