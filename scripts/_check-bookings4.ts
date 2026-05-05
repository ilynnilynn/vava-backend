import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
async function main() {
  // Check if the probe row exists
  const { data } = await admin.from('bookings').select('*').eq('id', '00000000-0000-0000-0000-000000000000')
  if (data && data[0]) {
    console.log('bookings columns:', Object.keys(data[0]).sort().join(', '))
    await admin.from('bookings').delete().eq('id', '00000000-0000-0000-0000-000000000000')
    console.log('probe row deleted')
  } else {
    console.log('no probe row found')
    // Try another approach: use supabase-js to query pg_catalog
    const cols = ['starts_at', 'session_starts_at', 'booking_starts_at', 'start_time', 'scheduled_at']
    for (const col of cols) {
      const { error } = await admin.from('bookings').select(col).limit(1)
      console.log(`  ${col}: ${error ? 'NOT FOUND' : 'EXISTS'}`)
    }
  }
}
main()
