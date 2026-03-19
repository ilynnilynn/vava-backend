// ============================================================
// /admin/pros — Pending pro review queue
//
// Lists all pros with submitted_at set but is_approved = false.
// Admin can view details and approve each pro.
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ApproveButton } from './ApproveButton'
import { ImageLightbox } from './ImageLightbox'

export default async function AdminProsPage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: pros } = await supabase
    .from('pros')
    .select('id, display_name, phone, ig_handle, studio_address, nail_scope, portfolio_photos, submitted_at, line_user_id, id_photo_path')
    .eq('is_approved', false)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: true })

  // Generate signed URLs for ID photos (private bucket)
  const idPhotoUrls: Record<string, string> = {}
  for (const pro of pros ?? []) {
    if (pro.id_photo_path) {
      const { data } = await admin.storage
        .from('id-photos')
        .createSignedUrl(pro.id_photo_path, 60 * 60) // 1 hour
      if (data?.signedUrl) idPhotoUrls[pro.id] = data.signedUrl
    }
  }

  const pending = pros ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pending Pros</h2>
        <span className="text-sm text-muted-foreground">{pending.length} pending</span>
      </div>

      {pending.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          No pending applications
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map(pro => (
            <div key={pro.id} className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{pro.display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Submitted {new Date(pro.submitted_at!).toLocaleDateString('zh-TW')}
                  </p>
                </div>
                <ApproveButton proId={pro.id} proLineUserId={pro.line_user_id ?? ''} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <Detail label="Phone" value={pro.phone} />
                <Detail label="IG" value={pro.ig_handle ? `@${pro.ig_handle}` : '—'} />
                <Detail label="Address" value={pro.studio_address} />
                <Detail label="Nail scope" value={pro.nail_scope ?? '—'} />
                <Detail label="Portfolio" value={`${pro.portfolio_photos?.length ?? 0} photos`} />
              </div>

              {pro.portfolio_photos && pro.portfolio_photos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {pro.portfolio_photos.slice(0, 6).map((url: string, i: number) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Portfolio ${i + 1}`}
                      className="h-20 w-20 rounded-lg object-cover shrink-0 border border-border"
                    />
                  ))}
                </div>
              )}

              {idPhotoUrls[pro.id] && (
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">ID Photo</span>
                  <ImageLightbox
                    src={idPhotoUrls[pro.id]}
                    alt="ID document"
                    className="h-32 rounded-lg object-cover border border-border"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-foreground">{value ?? '—'}</p>
    </div>
  )
}
