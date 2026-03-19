// ============================================================
// /pro/suspended — Account suspended
//
// Shown when a pro's account has been suspended by VAVA admin.
// No further action is available from the app — they must
// contact support to resolve the situation.
//
// Server component: minimal page, no Supabase read needed.
// If somehow reached without a session, redirect to /pro/login.
// ============================================================

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function ProSuspendedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/pro/login')

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm space-y-6 text-center">

        {/* Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <svg
            className="h-8 w-8 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        </div>

        {/* Copy */}
        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            帳號已停用
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            你的設計師帳號目前已被 VAVA 停用。
            <br />
            如有疑問，請聯繫我們的客服團隊。
          </p>
        </div>

        {/* Support CTA */}
        <a
          href="https://lin.ee/placeholder"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          聯絡 VAVA 客服
        </a>

      </div>
    </main>
  )
}
