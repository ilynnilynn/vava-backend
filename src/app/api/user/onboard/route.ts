import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const PHONE_REGEX = /^09\d{8}$/

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let phone: string
    let birth_year: number
    try {
      const body = await req.json()
      phone      = String(body.phone ?? '').trim()
      birth_year = Number(body.birth_year)
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    if (!PHONE_REGEX.test(phone)) {
      return NextResponse.json({ error: '手機號碼格式錯誤' }, { status: 400 })
    }

    const currentYear = new Date().getFullYear()
    if (!Number.isInteger(birth_year) || birth_year < 1950 || birth_year > currentYear - 16) {
      return NextResponse.json({ error: '出生年份無效' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Try UPDATE first (row should exist from auth/finalize upsert)
    const { data: updated, error: updateError } = await admin
      .from('users')
      .update({ phone, birth_year })
      .eq('id', user.id)
      .select('id')

    if (updateError) {
      // birth_year column might not exist — try phone only
      const { data: updated2, error: updateError2 } = await admin
        .from('users')
        .update({ phone })
        .eq('id', user.id)
        .select('id')

      if (updateError2) {
        return NextResponse.json({ error: `UPDATE failed: ${updateError2.message}` }, { status: 500 })
      }

      // If phone-only update worked, try adding birth_year separately
      if (updated2 && updated2.length > 0) {
        await admin.from('users').update({ birth_year }).eq('id', user.id)
      }

      return NextResponse.json({ ok: true })
    }

    // If UPDATE matched rows, we're done
    if (updated && updated.length > 0) {
      return NextResponse.json({ ok: true })
    }

    // Fallback: no row exists — INSERT with minimal columns
    const meta = user.user_metadata ?? {}
    const { error: insertError } = await admin
      .from('users')
      .insert({
        id:           user.id,
        phone,
        line_user_id: meta.line_user_id ?? null,
      })

    if (insertError) {
      return NextResponse.json({ error: `INSERT failed: ${insertError.message}` }, { status: 500 })
    }

    // Try setting birth_year separately (column may not exist)
    await admin.from('users').update({ birth_year }).eq('id', user.id)

    return NextResponse.json({ ok: true })

  } catch (err) {
    console.error('[user/onboard] unhandled error:', err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Crash: ${message}` }, { status: 500 })
  }
}
