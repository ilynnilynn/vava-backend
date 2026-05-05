import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
async function main() {
  const { data, error } = await admin.from('bookings').select('*').limit(0)
  // Try inserting a dummy to see column names
  const { data: d2, error: e2 } = await admin.from('bookings').select('*').limit(1)
  if (d2 && d2.length > 0) {
    console.log('bookings columns:', Object.keys(d2[0]))
  } else {
    console.log('bookings table empty, trying column probe...')
    // Insert with a known column to see what exists
    const { error: e3 } = await admin.from('bookings').insert({ id: '00000000-0000-0000-0000-000000000000' })
    console.log('probe error:', e3?.message)
  }
}
main()
