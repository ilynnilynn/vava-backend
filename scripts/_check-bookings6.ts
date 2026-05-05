import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
async function main() {
  // Use the OpenAPI spec endpoint
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const resp = await fetch(`${url}/rest/v1/?apikey=${key}`, {
    headers: { 'Accept': 'application/openapi+json' },
  })
  const text = await resp.text()
  // Find bookings definition
  const match = text.match(/"bookings":\s*\{[^}]*"properties":\s*\{([^}]+)\}/)
  if (match) {
    const props = match[1].match(/"(\w+)"/g)
    console.log('bookings columns:', props?.map(p => p.replace(/"/g, '')).join(', '))
  } else {
    // Just try common column names
    const candidates = [
      'id', 'user_id', 'pro_id', 'slot_id', 'status', 'created_at', 'updated_at',
      'price_min', 'price_max', 'service_category_ids', 'style_id',
      'starts_at', 'session_ends_at', 'no_show_window_minutes',
      'cancelled_at', 'cancellation_actor', 'completed_at',
      'preference', 'customer_note', 'early_completion',
      'lash_density', 'nail_scope', 'addon_ids', 'treatment_tier',
    ]
    for (const col of candidates) {
      const { error } = await admin.from('bookings').select(col).limit(1)
      const status = error ? 'NO' : 'YES'
      if (status === 'YES') process.stdout.write(`${col}, `)
    }
    console.log('')
  }
}
main()
