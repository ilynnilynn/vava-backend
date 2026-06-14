// ============================================================
// ADMIN LAYOUT — route group guard
//
// Requires authenticated user with is_admin = true.
// Redirects to /login if not authenticated or not admin.
// ============================================================

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminNav } from './AdminNav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check admin status from public.users — the single source of truth
  const { data: userRow } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!userRow?.is_admin) redirect('/login')

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <h1 className="text-sm font-bold tracking-tight">VAVA Admin</h1>
          <AdminNav />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
