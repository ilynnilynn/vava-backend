// ============================================================
// POST /api/places/geocode
// Server-side proxy to Google Geocoding API.
// Keeps API key hidden from the client.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.GOOGLE_PLACES_API_KEY

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const address = typeof body.address === 'string' ? body.address.trim() : ''
  if (!address) {
    return NextResponse.json({ error: 'address is required' }, { status: 400 })
  }

  if (!API_KEY) {
    return NextResponse.json(
      { error: 'Google Places API key not configured' },
      { status: 500 },
    )
  }

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('address', address)
  url.searchParams.set('key', API_KEY)
  url.searchParams.set('region', 'tw')
  url.searchParams.set('language', 'zh-TW')

  const res = await fetch(url.toString())
  const data = await res.json()

  if (data.status !== 'OK' || !data.results?.length) {
    return NextResponse.json(
      { error: data.error_message ?? `Geocoding failed: ${data.status}` },
      { status: 502 },
    )
  }

  const { lat, lng } = data.results[0].geometry.location

  return NextResponse.json({ lat, lng })
}
