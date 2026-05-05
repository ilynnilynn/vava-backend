// ============================================================
// POST /api/bookings/upload-ref-photo
//
// Uploads a customer's reference photo to the reference-photos
// bucket using the admin client (bypasses storage RLS).
//
// Accepts multipart/form-data with a single "file" field.
// Returns { url } (public URL) on success.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

export async function POST(req: NextRequest) {
  // ── Auth check ───────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
  }

  // ── Upload via admin client ──────────────────────────────
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${user.id}/${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const admin = createAdminClient()
  const { error: uploadErr } = await admin.storage
    .from('reference-photos')
    .upload(path, buffer, {
      upsert: true,
      contentType: file.type,
    })

  if (uploadErr) {
    console.error('[upload-ref-photo] upload error:', uploadErr)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage
    .from('reference-photos')
    .getPublicUrl(path)

  return NextResponse.json({ url: publicUrl })
}
