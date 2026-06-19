// GET /api/instagram/verify?username=<handle>
// Server-side proxy to Instagram's web_profile_info API.
// Avoids CORS and client-IP blocks that prevent direct calls from mobile apps.
//
// ⚠️  LOCKED endpoint and App-ID — do not change.
//     See myApp/app/(onboarding)/pro/instagram.tsx for full rationale.

import { NextRequest, NextResponse } from 'next/server'

const IG_API_URL = 'https://www.instagram.com/api/v1/users/web_profile_info/'
const IG_APP_ID = '936619743392459'

const IG_HEADERS: Record<string, string> = {
  'X-IG-App-ID': IG_APP_ID,
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  Accept: '*/*',
  // Instagram rejects requests with Sec-Fetch-* headers that don't match
  // a browser navigation. Override Node/Next.js defaults explicitly.
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Dest': 'empty',
  Referer: 'https://www.instagram.com/',
}

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username')?.trim() ?? ''

  if (!username) {
    return NextResponse.json({ state: 'network_error' }, { status: 400 })
  }

  const igUrl = `${IG_API_URL}?username=${encodeURIComponent(username)}`

  let res: Response
  try {
    res = await fetch(igUrl, {
      headers: IG_HEADERS,
      cache: 'no-store',
    })
  } catch (err) {
    console.error('[ig-verify] fetch error for', username, (err as Error).message)
    return NextResponse.json({ state: 'network_error' })
  }

  console.log('[ig-verify]', username, '→ HTTP', res.status)

  if (res.status === 404) return NextResponse.json({ state: 'not_found' })
  if (res.status === 429) return NextResponse.json({ state: 'rate_limit' })
  if (!res.ok) {
    console.error('[ig-verify] unexpected status', res.status, 'for', username)
    return NextResponse.json({ state: 'network_error' })
  }

  try {
    const json = await res.json()
    const user = json?.data?.user
    // 200 + missing user object = private/restricted account.
    // Non-existent accounts are caught above by the 404 check.
    if (!user) return NextResponse.json({ state: 'private' })
    if (user.is_private) return NextResponse.json({ state: 'private' })
    return NextResponse.json({ state: 'verified' })
  } catch (err) {
    console.error('[ig-verify] json parse error for', username, (err as Error).message)
    return NextResponse.json({ state: 'network_error' })
  }
}
