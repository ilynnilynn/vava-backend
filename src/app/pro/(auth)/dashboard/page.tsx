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

  const allBookings = await getProBookings(pro.id, supabase)

  // Resolve proposed_slot_id -> starts_at for reschedule_pending bookings
  const proposedSlotIds = allBookings
    .filter(b => b.status === 'reschedule_pending' && b.proposed_slot_id)
    .map(b => b.proposed_slot_id!)

  const proposedSlotMap: Record<string, string> = {}
  if (proposedSlotIds.length > 0) {
    const { data: proposedSlots } = await supabase
      .from('slots')
      .select('id, starts_at')
      .in('id', proposedSlotIds)
    for (const slot of proposedSlots ?? []) {
      proposedSlotMap[slot.id] = slot.starts_at
    }
  }

  return <HomeContent pro={pro} bookings={allBookings} proposedSlotMap={proposedSlotMap} />
}
