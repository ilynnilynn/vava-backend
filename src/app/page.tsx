// ============================================================
// ROOT PAGE — /
//
// Redirect based on session state:
//   - No session     → /login (unified Google login)
//   - Has session    → /home
// ============================================================

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect('/home')
  else      redirect('/login')
}
