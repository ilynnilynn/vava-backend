// ============================================================
// /auth/error — Generic auth error page
//
// Shown when LINE OAuth or Supabase session setup fails.
// Provides a clear message and a link back to login.
// ============================================================

import Link from 'next/link'

const errorMessages: Record<string, string> = {
  state_mismatch: '登入驗證失敗，請重新登入。',
  no_code:        '登入流程中斷，請重新登入。',
  auth_failed:    '登入失敗，請稍後再試。',
  session_failed: '無法建立登入工作階段，請重新登入。',
  setup_failed:   '帳號設定失敗，請聯繫客服。',
}

const DEFAULT_MESSAGE = '登入時發生錯誤，請重新登入。'

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const errorCode = params.error
  const message = (errorCode && errorMessages[errorCode]) || DEFAULT_MESSAGE

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="text-4xl">⚠️</div>

        <h1 className="text-xl font-semibold">登入失敗</h1>
        <p className="text-sm text-gray-500">{message}</p>

        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-black px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            返回客戶登入
          </Link>
          <Link
            href="/pro/login"
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-6 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            前往設計師登入
          </Link>
        </div>
      </div>
    </main>
  )
}
