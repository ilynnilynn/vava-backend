// ============================================================
// /home — Customer home screen
//
// Entry point after login + onboarding.
// Phase 4 builds the full booking flow from here.
// For now: greeting, service type selector, search CTA.
//
// Server component — reads user name from Supabase for greeting.
// ============================================================

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HomeClient from './HomeClient'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('name, phone, birth_year')
    .eq('id', user.id)
    .single()

  // Guard: if onboarding not complete, send them back
  if (!userData?.phone || !userData?.birth_year) {
    redirect('/onboarding')
  }

  const firstName = userData?.name?.split(' ')[0] ?? '你好'

  return <HomeClient firstName={firstName} />
}
