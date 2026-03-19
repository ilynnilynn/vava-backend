// ============================================================
// HEALTH CHECK ENDPOINT
// GET /api/health → confirms the API and Supabase are running
// Test it at: http://localhost:3000/api/health
// ============================================================
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { error } = await supabase.from('_health').select('count').limit(1).maybeSingle()

  // Any response (even table-not-found) means Supabase is reachable
  const supabaseConnected = !error || error.code !== 'PGRST301'

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    supabase: supabaseConnected ? 'connected' : 'error',
    ...(error && { supabase_detail: error.message }),
  })
}
