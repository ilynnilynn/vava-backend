// ============================================================
// PRO LAYOUT — route group (pro)
//
// Auth guard: must be logged in AND be an approved pro.
// Redirects to /pro/login if no session.
// Redirects to /pro/pending if pro exists but not yet approved.
// Redirects to /pro/login if no pro record at all.
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
    .select('id, is_approved, is_suspended')
    .eq('user_id', user.id)
    .single()

  if (!pro)              redirect('/pro/login')
  if (pro.is_suspended)  redirect('/pro/suspended')
  if (!pro.is_approved)  redirect('/pro/pending')

  return <>{children}</>
}
