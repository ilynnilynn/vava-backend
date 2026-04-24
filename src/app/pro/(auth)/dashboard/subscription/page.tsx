import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function SubscriptionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/pro/login')

  const { data: pro } = await supabase
    .from('pros')
    .select('subscription_status, confirmed_booking_count')
    .eq('id', user.id)
    .single()

  if (!pro) redirect('/pro/login')

  const { subscription_status, confirmed_booking_count } = pro
  const count = confirmed_booking_count ?? 0

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="text-xl font-bold">訂閱</h1>
        <p className="text-sm text-muted-foreground">
          管理你的訂閱方案
        </p>
      </div>

      {/* Free tier */}
      {subscription_status === 'free' && (
        <div className="rounded-lg border p-6 space-y-4">
          <div className="space-y-1">
            <p className="font-semibold">免費體驗</p>
            <p className="text-sm text-muted-foreground">
              前 10 筆預約免費，之後每月 NT$270
            </p>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>已使用</span>
              <span className="font-medium">{count} / 10</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min((count / 10) * 100, 100)}%` }}
              />
            </div>
          </div>

          {count >= 8 && (
            <p className="text-sm text-warning-foreground">
              即將達到免費額度上限
            </p>
          )}
        </div>
      )}

      {/* Active subscription */}
      {subscription_status === 'active' && (
        <div className="rounded-lg border p-6 space-y-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-success-muted text-success-foreground px-2 py-0.5 text-xs font-medium">
              訂閱中
            </span>
          </div>
          <p className="font-semibold">VAVA Pro</p>
          <p className="text-sm text-muted-foreground">
            NT$270/月 — 無限預約
          </p>
          <p className="text-sm text-muted-foreground">
            已完成 {count} 筆預約
          </p>
        </div>
      )}

      {/* Read-only (paywall) */}
      {subscription_status === 'read_only' && (
        <div className="rounded-lg border border-destructive/30 bg-destructive-muted p-6 space-y-4">
          <div className="space-y-1">
            <p className="font-semibold text-destructive">免費額度已用完</p>
            <p className="text-sm text-destructive">
              你已完成 {count} 筆預約。訂閱後即可繼續開放時段接單。
            </p>
          </div>

          <div className="rounded-lg bg-card border p-4 space-y-2">
            <p className="font-medium">VAVA Pro 方案</p>
            <p className="text-2xl font-bold">NT$270<span className="text-sm font-normal text-muted-foreground">/月</span></p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>- 無限開放時段</li>
              <li>- 無限接受預約</li>
              <li>- 完整紀錄與服務管理</li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">
            請透過 LINE 聯繫 VAVA 完成付款（銀行轉帳或 LINE Pay）
          </p>
        </div>
      )}
    </div>
  )
}
