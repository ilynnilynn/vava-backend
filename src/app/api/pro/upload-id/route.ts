// ============================================================
// POST /api/pro/upload-id
//
// Uploads a pro's ID photo to the id-photos bucket using the
// service role client (bypasses storage RLS).
//
// Accepts multipart/form-data with a single "file" field.
// Returns { path } on success.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  // ── Parse file from FormData ─────────────────────────────
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
  }

  // ── Upload via admin client ──────────────────────────────
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${user.id}/front.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const admin = createAdminClient()
  const { error: uploadErr } = await admin.storage
    .from('id-photos')
    .upload(path, buffer, {
      upsert: true,
      contentType: file.type,
    })

  if (uploadErr) {
    console.error('[pro/upload-id] upload error:', uploadErr)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  return NextResponse.json({ path })
}
