import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
async function main() {
  // Insert a dummy booking to discover columns from error or select
  const { data, error } = await admin.from('bookings').insert({
    user_id: '00000000-0000-0000-0000-000000000001',
    pro_id: '00000000-0000-0000-0000-000000000002',
    slot_id: '00000000-0000-0000-0000-000000000003',
    service_category_ids: [],
    price_min: 0,
    price_max: 0,
  }).select('*')
  if (error) {
    console.log('insert error:', error.message)
    // try select * to see what columns exist
    // The table might be empty but we can see columns from a real row
  }
  if (data && data[0]) {
    console.log('bookings columns:', Object.keys(data[0]))
    // clean up
    await admin.from('bookings').delete().eq('id', data[0].id)
  }
}
main()
