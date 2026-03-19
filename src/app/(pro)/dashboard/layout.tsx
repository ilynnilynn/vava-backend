import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/dashboard/BottomNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/pro/login')

  const { data: pro } = await supabase
    .from('pros')
    .select('id, subscription_status')
    .eq('id', user.id)
    .single()

  if (!pro) redirect('/pro/login')

  return (
    <div className="min-h-screen pb-16">
      <main className="mx-auto max-w-lg px-4">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
