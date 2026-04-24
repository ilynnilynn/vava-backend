// ============================================================
// /pro/pending — Submission success / confirmation
//
// Shown once after the pro submits onboarding. Confirms their
// application is under review and gives CTAs to start setting
// up services or explore the dashboard.
//
// If already approved → redirect to dashboard.
// If not yet submitted → redirect to onboarding.
// ============================================================

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ProPendingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/pro/login')

  const { data: pro } = await supabase
    .from('pros')
    .select('is_approved, submitted_at')
    .eq('id', user.id)
    .single()

  if (pro?.is_approved) redirect('/pro/dashboard')
  if (!pro?.submitted_at) redirect('/pro/onboarding')

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm space-y-6 text-center">

        {/* Success icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-muted">
          <svg
            className="h-8 w-8 text-success"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        {/* Copy */}
        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            提交成功！
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            你的設計師申請已送出，VAVA 團隊將於{' '}
            <strong className="text-foreground">3 個工作天</strong>{' '}
            內完成審核，結果會透過 LINE 通知你。審核期間你可以先設定服務項目。
          </p>
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          <Link
            href="/pro/dashboard/services"
            className="flex w-full items-center justify-center rounded-xl bg-foreground px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90 active:opacity-80"
          >
            設定服務項目
          </Link>
          <Link
            href="/pro/dashboard"
            className="flex w-full items-center justify-center rounded-xl border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent active:bg-accent/80"
          >
            開始瀏覽
          </Link>
        </div>

      </div>
    </main>
  )
}
