// lib/pro-dashboard-api.ts
import { supabase } from './supabase'

/**
 * Returns the pros.id and key dashboard fields for the logged-in user.
 */
async function getAuthPro() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const { data } = await supabase
    .from('pros')
    .select('id, is_accepting, subscription_status, confirmed_booking_count')
    .eq('user_id', session.user.id)
    .single()

  return data
}

export type ProDashboardData = {
  proId: string
  isAccepting: boolean
  subscriptionStatus: 'free' | 'active' | 'read_only'
  confirmedBookingCount: number
}

export async function fetchProDashboard(): Promise<ProDashboardData | null> {
  const pro = await getAuthPro()
  if (!pro) return null

  return {
    proId: pro.id,
    isAccepting: pro.is_accepting,
    subscriptionStatus: pro.subscription_status,
    confirmedBookingCount: pro.confirmed_booking_count,
  }
}

export async function toggleIsAccepting(isAccepting: boolean): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('pros')
    .update({ is_accepting: isAccepting })
    .eq('user_id', session.user.id)

  if (error) throw error
}

export type EarningsSummary = {
  today: number
  thisWeek: number
  thisMonth: number
  byService: { label: string; amount: number }[]
}

export async function fetchEarnings(): Promise<EarningsSummary> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { today: 0, thisWeek: 0, thisMonth: 0, byService: [] }

  const { data: pro } = await supabase
    .from('pros')
    .select('id')
    .eq('user_id', session.user.id)
    .single()
  if (!pro) return { today: 0, thisWeek: 0, thisMonth: 0, byService: [] }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, price_min, price_max, service_category_ids, completed_at')
    .eq('pro_id', pro.id)
    .eq('status', 'completed')
    .gte('completed_at', monthStart)
    .order('completed_at', { ascending: false })

  if (!bookings?.length) return { today: 0, thisWeek: 0, thisMonth: 0, byService: [] }

  // Batch-fetch category names
  const allCatIds = [...new Set(bookings.flatMap((b: any) => b.service_category_ids as string[]))]
  const { data: cats } = await supabase
    .from('service_categories')
    .select('id, name_zh')
    .in('id', allCatIds)
  const catMap = new Map((cats ?? []).map((c: any) => [c.id, c.name_zh as string]))

  let today = 0
  let thisWeek = 0
  let thisMonth = 0
  const serviceMap = new Map<string, number>()

  for (const b of bookings as any[]) {
    const amount = Math.round((b.price_min + b.price_max) / 2)
    const completedAt = b.completed_at as string

    thisMonth += amount
    if (completedAt >= weekStart) thisWeek += amount
    if (completedAt >= todayStart) today += amount

    // Aggregate by first service category
    const firstCatId = (b.service_category_ids as string[])[0]
    const label = catMap.get(firstCatId) ?? '其他'
    serviceMap.set(label, (serviceMap.get(label) ?? 0) + amount)
  }

  const byService = Array.from(serviceMap.entries())
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount)

  return { today, thisWeek, thisMonth, byService }
}

export async function cancelBooking(bookingId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled_pro',
      cancelled_at: new Date().toISOString(),
      cancellation_actor: 'pro',
    })
    .eq('id', bookingId)

  if (error) throw error
}
