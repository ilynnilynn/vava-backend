// ============================================================
// /admin/verification — ID Verification Queue
//
// Side-by-side layout: ID photo + pro info.
// Supports approve and decline with reasons.
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin'
import { CheckCircle2, Clock, XCircle, Inbox } from 'lucide-react'
import { VerificationCard } from './VerificationCard'

const REVIEWED_LIMIT = 10

export default async function AdminVerificationPage() {
  const admin = createAdminClient()

  // Use admin client to bypass RLS — the session client's SELECT
  // is restricted by "pros: public read approved" which hides
  // unapproved pros (the exact ones we need to review).
  const [
    { data: pendingPros, error: pendingError },
    { data: reviewedPros, error: reviewedError },
    { count: reviewedTotal, error: countError },
  ] = await Promise.all([
    admin
      .from('pros')
      .select('id, display_name, phone, ig_handle, studio_address, domains, submitted_at, line_user_id, id_photo_path, user_id, verification_status, application_count, rejection_reasons, rejection_note')
      .eq('verification_status', 'pending')
      .order('submitted_at', { ascending: true }),
    admin
      .from('pros')
      .select('id, display_name, phone, ig_handle, studio_address, domains, submitted_at, reviewed_at, line_user_id, id_photo_path, user_id, verification_status')
      .in('verification_status', ['approved', 'declined'])
      .order('reviewed_at', { ascending: false })
      .limit(REVIEWED_LIMIT),
    admin
      .from('pros')
      .select('*', { count: 'exact', head: true })
      .in('verification_status', ['approved', 'declined']),
  ])

  if (pendingError) console.error('[admin/verification] pending query error:', pendingError)
  if (reviewedError) console.error('[admin/verification] reviewed query error:', reviewedError)
  if (countError) console.error('[admin/verification] count query error:', countError)

  const pendingCount = (pendingPros ?? []).length
  const approvedCount = (reviewedPros ?? []).filter(p => p.verification_status === 'approved').length
  const declinedCount = (reviewedPros ?? []).filter(p => p.verification_status === 'declined').length
  const totalReviewed = reviewedTotal ?? (reviewedPros ?? []).length

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
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <Clock className="h-5 w-5 text-warning" />
          <div>
            <p className="text-2xl font-semibold">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <div>
            <p className="text-2xl font-semibold">{approvedCount}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <XCircle className="h-5 w-5 text-destructive" />
          <div>
            <p className="text-2xl font-semibold">{declinedCount}</p>
            <p className="text-xs text-muted-foreground">Declined</p>
          </div>
        </div>
      </div>

      {/* Pending section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Pending Verification</h2>
          <span className="text-sm text-muted-foreground">{pendingCount} pending</span>
        </div>

        {pendingCount === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">All caught up</p>
            <p className="text-xs text-muted-foreground/70">No pending verifications right now.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(pendingPros ?? []).map(pro => {
              // Strip id_photo_path and user_id — never pass storage paths or internal IDs to client
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { id_photo_path, user_id, verification_status, application_count, rejection_reasons, rejection_note, ...safeProData } = pro
              return (
                <VerificationCard
                  key={pro.id}
                  pro={safeProData}
                  idPhotoUrl={idPhotoUrls[pro.id] ?? null}
                  verificationStatus="pending"
                  applicationCount={application_count ?? 1}
                  previousRejectionReasons={rejection_reasons as string[] | null}
                  previousRejectionNote={rejection_note as string | null}
                />
              )
            })}
          </div>
        )}
      </section>

      {/* Section divider */}
      <div className="border-t border-border" />

      {/* Reviewed section */}
      {(reviewedPros ?? []).length > 0 && (
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-muted-foreground">
            Recently Reviewed (showing {(reviewedPros ?? []).length} of {totalReviewed})
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
