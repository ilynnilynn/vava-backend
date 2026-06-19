import { NextRequest, NextResponse } from 'next/server'

/** Returns a 401 response if the cron secret is missing/wrong, null if OK. */
export function requireCron(req: NextRequest): NextResponse | null {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
