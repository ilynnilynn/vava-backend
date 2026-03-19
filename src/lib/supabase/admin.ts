// ============================================================
// SUPABASE ADMIN CLIENT — service role, server-side only
//
// Use this for operations that bypass RLS:
//   - LINE webhook (no user session)
//   - Cron routes (no user session)
//   - Auth user provisioning (createUser, generateLink)
//
// NEVER import this in a Client Component. NEVER expose the key.
// ============================================================
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
