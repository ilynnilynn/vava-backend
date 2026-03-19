// ============================================================
// /pro/pending — Awaiting admin approval
//
// Shown after the pro submits their profile, while the VAVA
// team reviews it. No action needed from the pro — they just wait.
//
// Server component: reads pro name from Supabase for personalisation.
// If somehow reached without a session, redirect to /pro/login.
// ============================================================

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function ProPendingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/pro/login')

  const { data: pro } = await supabase
    .from('pros')
    .select('display_name, is_approved, submitted_at')
    .eq('id', user.id)
    .single()

  // If approved since last check, send them to the dashboard
  if (pro?.is_approved) redirect('/pro/dashboard')

  // If they haven't submitted yet, send them back to onboarding
  if (!pro?.submitted_at) redirect('/pro/onboarding')

  const firstName = pro?.display_name?.split(' ')[0] ?? '你'

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm space-y-6 text-center">

        {/* Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
          <svg
            className="h-8 w-8 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Copy */}
        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            審核中，{firstName}！
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            你的設計師申請已收到。
            <br />
            VAVA 團隊將於 <strong className="text-foreground">3 個工作天</strong> 內完成審核，
            結果會透過 LINE 通知你。
          </p>
        </div>

        {/* Divider */}
        <hr className="border-border" />

        {/* Next steps hint */}
        <div className="space-y-1.5 text-left">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            審核時我們會確認
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-foreground">·</span>
              作品集及服務資訊是否完整
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-foreground">·</span>
              工作室地址是否可查驗
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-foreground">·</span>
              是否符合 VAVA 服務品質標準
            </li>
          </ul>
        </div>

        {/* Support link */}
        <p className="text-xs text-muted-foreground">
          有問題？{' '}
          <a
            href="https://lin.ee/placeholder"
            className="text-foreground underline underline-offset-2"
          >
            聯絡 VAVA 客服
          </a>
        </p>

      </div>
    </main>
  )
}
