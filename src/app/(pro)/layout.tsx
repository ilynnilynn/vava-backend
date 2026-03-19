// ============================================================
// PRO LAYOUT — route group (pro)
//
// Auth guard: must be logged in AND be a submitted pro.
// Redirects to /pro/login if no session or no pro record.
// Redirects to /pro/suspended if pro is suspended.
// Redirects to /pro/onboarding if pro hasn't submitted yet.
//
// NOTE: is_approved only controls visibility in customer search,
// not dashboard access. Pros can use the dashboard while pending.
// ============================================================

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function ProLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/pro/login')

  const { data: pro } = await supabase
    .from('pros')
    .select('id, is_approved, is_suspended, submitted_at')
    .eq('id', user.id)
    .single()

  if (!pro)              redirect('/pro/login')
  if (pro.is_suspended)  redirect('/pro/suspended')
  if (!pro.submitted_at) redirect('/pro/onboarding')

  return <>{children}</>
}
