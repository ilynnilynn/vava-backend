'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ImageLightbox } from '../pros/ImageLightbox'
import { DeclineModal } from './DeclineModal'

type ProData = {
  id: string
  display_name: string
  phone: string | null
  ig_handle: string | null
  studio_address: string | null
  domains: string[] | null
  submitted_at: string
  line_user_id: string | null
}

type VerificationStatus = 'pending' | 'approved' | 'declined'

const STATUS_BADGE: Record<VerificationStatus, { label: string; className: string }> = {
  pending:  { label: 'Pending',  className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-800 border-green-200' },
  declined: { label: 'Declined', className: 'bg-red-100 text-red-800 border-red-200' },
}

const DOMAIN_LABELS: Record<string, string> = {
  nails:  'Nails',
  lashes: 'Lashes',
  makeup: 'Makeup',
}

function formatSubmittedAt(isoStr: string): string {
  const d = new Date(isoStr)
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}/${m}/${day} ${h}:${min}`
}


export function VerificationCard({
  pro,
  idPhotoUrl,
  verificationStatus,
}: {
  pro: ProData
  idPhotoUrl: string | null
  verificationStatus: VerificationStatus
}) {
  const router = useRouter()
  const [actionState, setActionState] = useState<'idle' | 'approving' | 'declining'>('idle')
  const [showDecline, setShowDecline] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const isTerminal = verificationStatus === 'approved' || verificationStatus === 'declined'
  const isBusy = actionState !== 'idle'

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }, [])

  async function handleApprove() {
    setActionState('approving')
    try {
      const res = await fetch('/api/admin/pros/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proId: pro.id, proLineUserId: pro.line_user_id ?? '' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to approve')
      }
      showToast('success', `${pro.display_name} approved`)
      setTimeout(() => router.refresh(), 800)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to approve')
    } finally {
      setActionState('idle')
    }
  }

  function handleDeclined() {
    setShowDecline(false)
    showToast('success', `${pro.display_name} declined`)
    setTimeout(() => router.refresh(), 800)
  }

  const badge = STATUS_BADGE[verificationStatus]
  const domainLabel = (pro.domains ?? [])
    .map(d => DOMAIN_LABELS[d] ?? d)
    .join(', ') || '—'

  return (
    <>
      <div className={`rounded-xl border bg-card p-5 space-y-4 ${isTerminal ? 'border-border/50 opacity-75' : 'border-border'}`}>
        {/* Header: name + badge */}
        <div className="flex items-center justify-between">
          <p className="font-semibold">{pro.display_name}</p>
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
            {badge.label}
          </span>
        </div>

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
              <div className="h-40 w-32 rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground text-center px-2">
                ID photo unavailable
              </div>
            )}
          </div>

          {/* Right: Pro info */}
          <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Detail label="Phone" value={pro.phone ?? '—'} />
            <Detail label="Instagram" value={pro.ig_handle ? `@${pro.ig_handle}` : '—'} />
            <Detail label="Studio Address" value={pro.studio_address ?? '—'} />
            <Detail label="Services" value={domainLabel} />
            <Detail label="Submitted" value={formatSubmittedAt(pro.submitted_at)} />
          </div>
        </div>

        {/* Action buttons — only for pending */}
        {!isTerminal && (
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleApprove}
              disabled={isBusy}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              {actionState === 'approving' ? 'Approving…' : 'Approve'}
            </button>
            <button
              onClick={() => setShowDecline(true)}
              disabled={isBusy}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              Decline
            </button>
          </div>
        )}

        {/* Inline toast */}
        {toast && (
          <div className={`rounded-lg px-3 py-2 text-sm ${
            toast.type === 'success'
              ? 'bg-green-50 text-[#2DB276] border border-green-200'
              : 'bg-red-50 text-[#B22D47] border border-red-200'
          }`}>
            {toast.message}
          </div>
        )}
      </div>

      {showDecline && (
        <DeclineModal
          proId={pro.id}
          proName={pro.display_name}
          onClose={() => setShowDecline(false)}
          onDeclined={handleDeclined}
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
