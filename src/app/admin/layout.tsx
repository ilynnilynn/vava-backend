// ============================================================
// ADMIN LAYOUT — route group guard
//
// Requires authenticated user with is_admin = true.
// Redirects to /login if not authenticated or not admin.
// ============================================================

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!userData?.is_admin) redirect('/login')

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <h1 className="text-sm font-bold tracking-tight">VAVA Admin</h1>
          <nav className="flex gap-4 text-sm">
            <a href="/admin/pros" className="text-muted-foreground hover:text-foreground transition-colors">
              Pending Pros
            </a>
          </nav>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
