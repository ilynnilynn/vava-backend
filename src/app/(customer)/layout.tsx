// ============================================================
// CUSTOMER LAYOUT — route group (customer)
//
// Auth guard: must be logged in as a user.
// Redirects to /login if no session.
// ============================================================

import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { CustomerBottomNav } from '@/components/customer/BottomNav'

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAuthUser()

  if (!user) redirect('/login')

  return (
    <>
      {children}
      <CustomerBottomNav />
    </>
  )
}
