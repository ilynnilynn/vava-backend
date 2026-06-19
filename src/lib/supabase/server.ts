// ============================================================
// SUPABASE SERVER CLIENT — for use in Server Components, API Routes, Server Actions
// Usage: import { createClient } from '@/lib/supabase/server'
//        import { createClientForRequest } from '@/lib/supabase/server'
// ============================================================
import { createServerClient } from '@supabase/ssr'
import { createClient as createBareClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

/** Cookie-based client for Server Components and web API routes */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore: called from Server Component (read-only)
          }
        },
      },
    }
  )
}

/**
 * Create a Supabase client that supports both auth methods:
 *  - Bearer token (mobile app sends Authorization header)
 *  - Cookie session (web browser)
 *
 * Use this in API routes called by both web and mobile clients.
 */
export async function createClientForRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (token) {
    // Mobile client: use bare client with the access token
    const client = createBareClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    )
    return client
  }

  // Web client: fall back to cookie-based auth
  return createClient()
}
