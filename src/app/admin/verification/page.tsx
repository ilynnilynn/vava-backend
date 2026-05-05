// ============================================================
// /admin/verification — ID Verification Queue
//
// Side-by-side layout: ID photo + pro info.
// Supports approve and decline with reasons.
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { VerificationCard } from './VerificationCard'

export default async function AdminVerificationPage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: pros } = await supabase
    .from('pros')
    .select('id, display_name, phone, ig_handle, studio_address, nail_scope, portfolio_photos, submitted_at, line_user_id, id_photo_path, created_at')
    .eq('is_approved', false)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: true })

  // Generate signed URLs for ID photos (private bucket, 5 min expiry)
  const idPhotoUrls: Record<string, string> = {}
  for (const pro of pros ?? []) {
    if (pro.id_photo_path) {
      const { data } = await admin.storage
        .from('id-photos')
        .createSignedUrl(pro.id_photo_path, 300)
      if (data?.signedUrl) idPhotoUrls[pro.id] = data.signedUrl
    }
  }

  const pending = pros ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">ID Verification</h2>
        <span className="text-sm text-muted-foreground">{pending.length} pending</span>
      </div>

      {pending.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          No pending verifications
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map(pro => (
            <VerificationCard
              key={pro.id}
              pro={pro}
              idPhotoUrl={idPhotoUrls[pro.id] ?? null}
            />
          ))}
        </div>
      )}
    </div>
  )
}
