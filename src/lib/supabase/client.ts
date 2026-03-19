// ============================================================
// SUPABASE CLIENT — for use in Client Components (browser)
// Usage: import { createClient } from '@/lib/supabase/client'
// ============================================================
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
