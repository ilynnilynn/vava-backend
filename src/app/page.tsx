// ============================================================
// ROOT PAGE — /
//
// Redirect based on session state:
//   - No session     → /login (customer entry)
//   - Has session    → /home  (customer home)
//
// Pro entry is at /pro/login — separate flow.
// ============================================================

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect('/home')
  else      redirect('/login')
}
