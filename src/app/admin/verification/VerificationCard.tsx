'use client'

import { useState } from 'react'
import { ImageLightbox } from '../pros/ImageLightbox'
import { DeclineModal } from './DeclineModal'

type ProData = {
  id: string
  display_name: string
  phone: string
  ig_handle: string | null
  studio_address: string
  nail_scope: string | null
  portfolio_photos: string[] | null
  submitted_at: string
  line_user_id: string | null
  created_at: string
}

export function VerificationCard({
  pro,
  idPhotoUrl,
}: {
  pro: ProData
  idPhotoUrl: string | null
}) {
  const [status, setStatus] = useState<'idle' | 'approving' | 'approved' | 'declined' | 'error'>('idle')
  const [showDecline, setShowDecline] = useState(false)

  async function handleApprove() {
    setStatus('approving')
    try {
      const res = await fetch('/api/admin/pros/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proId: pro.id, proLineUserId: pro.line_user_id ?? '' }),
      })
      if (!res.ok) throw new Error('Failed')
      setStatus('approved')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'approved') {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center text-sm text-green-700">
        {pro.display_name} approved
      </div>
    )
  }

  if (status === 'declined') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center text-sm text-red-700">
        {pro.display_name} declined
      </div>
    )
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        {/* Side-by-side: ID photo + info */}
        <div className="flex gap-5">
          {/* Left: ID photo */}
          <div className="shrink-0">
            {idPhotoUrl ? (
              <ImageLightbox
                src={idPhotoUrl}
                alt="ID document"
                className="h-40 w-32 rounded-lg object-cover border border-border"
              />
            ) : (
              <div className="h-40 w-32 rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
                No ID photo
              </div>
            )}
          </div>

          {/* Right: Pro info */}
          <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Detail label="Name" value={pro.display_name} />
            <Detail label="Phone" value={pro.phone} />
            <Detail label="Instagram" value={pro.ig_handle ? `@${pro.ig_handle}` : '—'} />
            <Detail label="Address" value={pro.studio_address} />
            <Detail label="Nail scope" value={pro.nail_scope ?? '—'} />
            <Detail label="Portfolio" value={`${pro.portfolio_photos?.length ?? 0} photos`} />
            <Detail label="Submitted" value={new Date(pro.submitted_at).toLocaleDateString('zh-TW')} />
            <Detail label="Created" value={new Date(pro.created_at).toLocaleDateString('zh-TW')} />
          </div>
        </div>

        {/* Portfolio preview */}
        {pro.portfolio_photos && pro.portfolio_photos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {pro.portfolio_photos.slice(0, 6).map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Portfolio ${i + 1}`}
                className="h-16 w-16 rounded-lg object-cover shrink-0 border border-border"
              />
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={handleApprove}
            disabled={status === 'approving'}
            className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {status === 'approving' ? 'Approving...' : 'Approve'}
          </button>
          <button
            onClick={() => setShowDecline(true)}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            Decline
          </button>
        </div>

        {status === 'error' && (
          <p className="text-xs text-red-600">Action failed. Please try again.</p>
        )}
      </div>

      {showDecline && (
        <DeclineModal
          proId={pro.id}
          proName={pro.display_name}
          onClose={() => setShowDecline(false)}
          onDeclined={() => {
            setShowDecline(false)
            setStatus('declined')
          }}
        />
      )}
    </>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-foreground truncate">{value}</p>
    </div>
  )
}
