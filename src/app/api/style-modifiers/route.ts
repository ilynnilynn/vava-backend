// ============================================================
// GET /api/style-modifiers
// Returns all active service_style_modifiers.
// Uses service role key so RLS is bypassed — this is safe
// because style modifiers are public reference data.
// ============================================================

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('service_style_modifiers')
    .select('id, key, name_zh, service_type')
    .eq('is_active', true)
    .order('sort_order')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
