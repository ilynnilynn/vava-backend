import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
async function main() {
  // Test selecting starts_at
  const { error: e1 } = await admin.from('bookings').select('starts_at').limit(1)
  console.log('starts_at:', e1?.message ?? 'EXISTS')

  // Test selecting all to see actual columns
  const { error: e2 } = await admin.from('bookings').select('id, user_id, pro_id, slot_id, status').limit(1)
  console.log('basic cols:', e2?.message ?? 'EXISTS')

  // Get full schema via information_schema workaround
  // Try inserting with starts_at to see if it's recognized
  const { error: e3 } = await admin.from('bookings').select('*').limit(1)
  console.log('select * error:', e3?.message ?? 'OK')
  
  // Delete the probe row
  await admin.from('bookings').delete().eq('id', '00000000-0000-0000-0000-000000000000')
}
main()
