// ============================================================
// /pro/login — Pro login page
//
// Same LINE OAuth flow as customer login, but:
//   - type=pro is passed so callback routes to pro dashboard
//   - Messaging is different (設計師 not 客戶)
//   - Link back to customer login at the bottom
// ============================================================

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// If already logged in as an approved pro, skip login
export default async function ProLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: pro } = await supabase
      .from('pros')
      .select('is_approved, submitted_at')
      .eq('id', user.id)
      .single()

    if (pro?.is_approved)  redirect('/pro/dashboard')
    if (pro?.submitted_at) redirect('/pro/dashboard')
    if (pro)               redirect('/pro/onboarding')
  }

  const params = await searchParams
  const error  = params.error

  const errorMessages: Record<string, string> = {
    state_mismatch: '登入失敗，請重試。',
    no_code:        '登入失敗，請重試。',
    auth_failed:    '登入失敗，請稍後再試。',
    session_failed: '登入失敗，請稍後再試。',
    setup_failed:   '帳號設定失敗，請聯繫客服。',
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo / wordmark */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">VAVA</h1>
          <p className="mt-2 text-sm text-gray-500">設計師專區</p>
        </div>

        {/* Error message */}
        {error && errorMessages[error] && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {errorMessages[error]}
          </div>
        )}

        {/* LINE login button */}
        <a
          href="/api/auth/line?type=pro"
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#06C755] px-6 py-4 text-base font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
        >
          {/* LINE icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white" aria-hidden="true">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.630 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.070 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
          </svg>
          使用 LINE 登入
        </a>

        {/* Customer login link */}
        <p className="text-center text-xs text-gray-400">
          找設計師預約？{' '}
          <a href="/login" className="text-gray-600 underline underline-offset-2">
            前往客戶登入
          </a>
        </p>

      </div>
    </main>
  )
}
