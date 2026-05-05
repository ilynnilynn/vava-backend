import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
async function main() {
  // Use REST API to get columns from PostgREST OPTIONS
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const resp = await fetch(`${url}/rest/v1/bookings?limit=0`, {
    method: 'GET',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Accept': 'application/json',
      'Prefer': 'count=exact',
    },
  })
  // The Content-Range header tells us the columns via the response
  // But actually, OPTIONS request shows the schema
  const optResp = await fetch(`${url}/rest/v1/`, {
    method: 'OPTIONS',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
    },
  })
  const schema = await optResp.json()
  const bookingsDef = schema?.definitions?.bookings
  if (bookingsDef?.properties) {
    console.log('bookings columns:', Object.keys(bookingsDef.properties).sort().join('\n'))
  } else {
    console.log('Could not get schema, trying HEAD...')
    console.log('OPTIONS keys:', Object.keys(schema?.definitions ?? {}).slice(0, 5))
  }
}
main()
