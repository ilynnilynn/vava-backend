// ============================================================
// SUPABASE MIDDLEWARE HELPER — refreshes auth sessions on every request
// Used by: /middleware.ts (project root)
// ============================================================
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — reads JWT from cookie, only contacts Supabase Auth
  // server when the token is expired and needs refreshing (~1x per hour).
  // Actual auth validation happens in server components via getAuthUser().
  await supabase.auth.getSession()

  return supabaseResponse
}
