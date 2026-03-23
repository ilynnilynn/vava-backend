// ============================================================
// VAVA — Backfill studio_lat / studio_lng for existing pros
//
// Geocodes each pro's studio_address using Google Geocoding API
// and writes the lat/lng back to the pros table.
//
// Only processes pros where studio_lat IS NULL and studio_address
// is non-empty. Safe to re-run — already-geocoded pros are skipped.
//
// Run: npx tsx scripts/backfill-pro-latlng.ts
// ============================================================

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load .env.local first (Next.js convention), fall back to .env
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

if (!GOOGLE_API_KEY) {
  console.error('Missing GOOGLE_PLACES_API_KEY in .env')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('address', address)
  url.searchParams.set('key', GOOGLE_API_KEY!)
  url.searchParams.set('region', 'tw')
  url.searchParams.set('language', 'zh-TW')

  const res = await fetch(url.toString())
  const data = await res.json()

  if (data.status !== 'OK' || !data.results?.length) {
    return null
  }

  return data.results[0].geometry.location
}

async function main() {
  // Fetch pros that need geocoding
  const { data: pros, error } = await admin
    .from('pros')
    .select('id, display_name, studio_address, studio_lat')
    .is('studio_lat', null)
    .neq('studio_address', '')

  if (error) {
    console.error('Failed to fetch pros:', error.message)
    process.exit(1)
  }

  if (!pros?.length) {
    console.log('No pros need geocoding. All done!')
    return
  }

  console.log(`Found ${pros.length} pros to geocode.\n`)

  let success = 0
  let failed = 0

  for (const pro of pros) {
    const address = pro.studio_address
    if (!address) {
      console.log(`  SKIP ${pro.display_name} — no address`)
      continue
    }

    console.log(`  Geocoding "${pro.display_name}" — ${address}`)

    const result = await geocode(address)

    if (!result) {
      console.log(`    FAIL — could not geocode`)
      failed++
      continue
    }

    const { error: updateErr } = await admin
      .from('pros')
      .update({ studio_lat: result.lat, studio_lng: result.lng })
      .eq('id', pro.id)

    if (updateErr) {
      console.log(`    FAIL — DB update error: ${updateErr.message}`)
      failed++
      continue
    }

    console.log(`    OK — ${result.lat}, ${result.lng}`)
    success++

    // Rate limit: Google Geocoding API has 50 QPS for free tier
    // Be conservative — wait 200ms between requests
    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`\nDone. Success: ${success}, Failed: ${failed}`)
}

main()
