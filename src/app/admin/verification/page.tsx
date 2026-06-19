// ============================================================
// /admin/verification — ID Verification Queue
//
// Side-by-side layout: ID photo + pro info.
// Supports approve and decline with reasons.
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin'
import { VerificationCard } from './VerificationCard'

export default async function AdminVerificationPage() {
  const admin = createAdminClient()

  // Use admin client to bypass RLS — the session client's SELECT
  // is restricted by "pros: public read approved" which hides
  // unapproved pros (the exact ones we need to review).
  const [
    { data: pendingPros, error: pendingError },
    { data: reviewedPros, error: reviewedError },
  ] = await Promise.all([
    admin
      .from('pros')
      .select('id, display_name, phone, ig_handle, studio_address, domains, submitted_at, line_user_id, id_photo_path, user_id, verification_status')
      .eq('verification_status', 'pending')
      .order('submitted_at', { ascending: true }),
    admin
      .from('pros')
      .select('id, display_name, phone, ig_handle, studio_address, domains, submitted_at, reviewed_at, line_user_id, id_photo_path, user_id, verification_status')
      .in('verification_status', ['approved', 'declined'])
      .order('reviewed_at', { ascending: false }),
  ])

  if (pendingError) console.error('[admin/verification] pending query error:', pendingError)
  if (reviewedError) console.error('[admin/verification] reviewed query error:', reviewedError)

  // Combine both lists for signed URL generation
  const allPros = [...(pendingPros ?? []), ...(reviewedPros ?? [])]

  // Generate signed URLs for ID photos (private bucket, 5 min expiry)
  const idPhotoUrls: Record<string, string> = {}
  for (const pro of allPros) {
    if (pro.id_photo_path) {
      const { data, error: signError } = await admin.storage
        .from('id-photos')
        .createSignedUrl(pro.id_photo_path, 300)
      if (signError) {
        console.error(`[admin/verification] signed URL failed for pro ${pro.id}, path "${pro.id_photo_path}":`, signError)
      } else if (data?.signedUrl) {
        idPhotoUrls[pro.id] = data.signedUrl
      }
    } else {
      console.warn(`[admin/verification] pro ${pro.id} has no id_photo_path`)
    }
  }

  return (
    <div className="space-y-8">
      {/* Pending section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Pending Verification</h2>
          <span className="text-sm text-muted-foreground">{(pendingPros ?? []).length} pending</span>
        </div>

        {(pendingPros ?? []).length === 0 ? (
          <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
            No pending verifications.
          </div>
        ) : (
          <div className="space-y-4">
            {(pendingPros ?? []).map(pro => {
              // Strip id_photo_path and user_id — never pass storage paths or internal IDs to client
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { id_photo_path, user_id, verification_status, ...safeProData } = pro
              return (
                <VerificationCard
                  key={pro.id}
                  pro={safeProData}
                  idPhotoUrl={idPhotoUrls[pro.id] ?? null}
                  verificationStatus="pending"
                />
              )
            })}
          </div>
        )}
      </section>

      {/* Reviewed section */}
      {(reviewedPros ?? []).length > 0 && (
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-muted-foreground">
            Recently Reviewed ({(reviewedPros ?? []).length})
          </h2>
          <div className="space-y-3">
            {(reviewedPros ?? []).map(pro => {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { id_photo_path, user_id, verification_status, ...safeProData } = pro
              return (
                <VerificationCard
                  key={pro.id}
                  pro={safeProData}
                  idPhotoUrl={idPhotoUrls[pro.id] ?? null}
                  verificationStatus={pro.verification_status as 'approved' | 'declined'}
                />
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
