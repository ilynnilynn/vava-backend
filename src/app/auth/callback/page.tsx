'use client'

// ============================================================
// /auth/callback — client-side session handler
//
// Why client-side:
//   Supabase admin-generated magic links use implicit flow.
//   Tokens arrive as URL hash fragments (#access_token=...).
//   Hash fragments are browser-only — never sent to the server.
//   createBrowserClient handles both PKCE and implicit flows
//   automatically, so getSession() works regardless of flow type.
//
// Flow:
//   1. Supabase magic link redirects here
//   2. createBrowserClient detects hash tokens → sets session
//   3. POST /api/auth/finalize → upsert user/pro row
//   4. Server returns redirect URL → router.replace()
// ============================================================

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-400">登入中⋯</p>
      </main>
    }>
      <AuthCallbackInner />
    </Suspense>
  )
}

function AuthCallbackInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    async function handleAuth() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // type is now determined server-side in /api/auth/finalize via user_metadata.
      // We only need it here for error redirect path.
      const loginPath = '/login'

      // 1. Try getSession() first (works if PKCE code was already exchanged)
      let { data: { session } } = await supabase.auth.getSession()

      // 2. If no session, parse URL hash for implicit flow tokens
      //    Admin magic links use implicit flow: #access_token=...&refresh_token=...
      if (!session) {
        const hash   = window.location.hash
        const params = new URLSearchParams(hash.slice(1))
        const accessToken  = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (accessToken && refreshToken) {
          const { data } = await supabase.auth.setSession({
            access_token:  accessToken,
            refresh_token: refreshToken,
          })
          session = data.session
        }
      }

      // 3. If still no session, check for PKCE code in query params
      if (!session) {
        const code = new URLSearchParams(window.location.search).get('code')
        if (code) {
          const { data } = await supabase.auth.exchangeCodeForSession(code)
          session = data.session
        }
      }

      if (!session) {
        console.error('[auth/callback] no session found — hash:', window.location.hash)
        router.replace(`${loginPath}?error=session_failed`)
        return
      }

      try {
        // finalize reads type + profile from user_metadata (set by generateLink)
        const res = await fetch('/api/auth/finalize', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({}),
        })

        if (!res.ok) {
          router.replace(`${loginPath}?error=setup_failed`)
          return
        }

        const { redirectTo } = await res.json()
        router.replace(redirectTo)

      } catch {
        router.replace(`${loginPath}?error=setup_failed`)
      }
    }

    handleAuth()
  }, [router, searchParams])

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-gray-400">登入中⋯</p>
    </main>
  )
}
