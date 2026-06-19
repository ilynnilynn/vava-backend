'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
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
  pending:  { label: 'Pending',  className: 'bg-warning-muted text-warning-foreground border-warning/30' },
  approved: { label: 'Approved', className: 'bg-success-muted text-success-foreground border-success/30' },
  declined: { label: 'Declined', className: 'bg-destructive-muted text-destructive border-destructive/30' },
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

function formatRelativeTime(isoStr: string): string {
  const now = Date.now()
  const then = new Date(isoStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

function isOverdue(isoStr: string): boolean {
  return Date.now() - new Date(isoStr).getTime() > 48 * 60 * 60 * 1000
}


export function VerificationCard({
  pro,
  idPhotoUrl,
  verificationStatus,
  applicationCount = 1,
  previousRejectionReasons = null,
  previousRejectionNote = null,
}: {
  pro: ProData
  idPhotoUrl: string | null
  verificationStatus: VerificationStatus
  applicationCount?: number
  previousRejectionReasons?: string[] | null
  previousRejectionNote?: string | null
}) {
  const router = useRouter()
  const [actionState, setActionState] = useState<'idle' | 'approving' | 'declining'>('idle')
  const [showDecline, setShowDecline] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const isTerminal = verificationStatus === 'approved' || verificationStatus === 'declined'
  const isPending = verificationStatus === 'pending'
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
      <div
        className={cn(
          'rounded-xl border bg-card p-5 space-y-4',
          isPending && 'border-l-4 border-l-warning border-border',
          isTerminal && 'border-border/60',
        )}
      >
        {/* Header: name + urgency badge + status badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="font-semibold">{pro.display_name}</p>
            {isPending && isOverdue(pro.submitted_at) && (
              <span className="inline-flex items-center rounded-full bg-destructive-muted px-2 py-0.5 text-xs font-medium text-destructive">
                {formatRelativeTime(pro.submitted_at)}
              </span>
            )}
          </div>
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
            {badge.label}
          </span>
        </div>

        {/* Reapply history — shown when this is not the first application */}
        {applicationCount > 1 && isPending && (
          <div className="rounded-lg border border-warning/30 bg-warning-muted px-4 py-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium text-warning-foreground">
                Reapplication #{applicationCount}
              </span>
            </div>
            {previousRejectionReasons && previousRejectionReasons.length > 0 && (
              <div className="text-xs text-warning-foreground/80">
                <span className="font-medium">Previous rejection reasons:</span>
                <ul className="mt-1 ml-4 list-disc space-y-0.5">
                  {previousRejectionReasons.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}
            {previousRejectionNote && (
              <p className="text-xs text-warning-foreground/80">
                <span className="font-medium">Previous note:</span> {previousRejectionNote}
              </p>
            )}
          </div>
        )}

        {/* Side-by-side: ID photo + info — stacks on mobile */}
        <div className="flex flex-col sm:flex-row gap-5">
          {/* Left: ID photo */}
          <div className="shrink-0">
            {idPhotoUrl ? (
              <div className="space-y-1">
                <ImageLightbox
                  src={idPhotoUrl}
                  alt="ID document"
                  className="h-[260px] w-[200px] rounded-lg object-cover border border-border"
                />
                <p className="text-[11px] text-muted-foreground/60 text-center">Click to enlarge</p>
              </div>
            ) : (
              <div className="h-[260px] w-[200px] rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground text-center px-2">
                ID photo unavailable
              </div>
            )}
          </div>

          {/* Right: Pro info */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Detail label="Phone" value={pro.phone ?? '—'} />
            <Detail
              label="Instagram"
              value={pro.ig_handle ? `@${pro.ig_handle}` : '—'}
              href={pro.ig_handle ? `https://instagram.com/${pro.ig_handle}` : undefined}
            />
            <Detail label="Studio Address" value={pro.studio_address ?? '—'} />
            <Detail label="Services" value={domainLabel} />
            <Detail
              label="Submitted"
              value={`${formatSubmittedAt(pro.submitted_at)} (${formatRelativeTime(pro.submitted_at)})`}
            />
          </div>
        </div>

        {/* Action buttons — only for pending */}
        {!isTerminal && (
          <div className="flex gap-3 pt-1">
            <Button
              onClick={handleApprove}
              disabled={isBusy}
              className="flex-1 bg-success text-white hover:bg-success/90"
            >
              {actionState === 'approving' ? 'Approving…' : 'Approve'}
            </Button>
            <Button
              onClick={() => setShowDecline(true)}
              disabled={isBusy}
              variant="outline"
              className="flex-1 border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              Decline
            </Button>
          </div>
        )}

        {/* Inline toast */}
        {toast && (
          <div
            className={cn(
              'flex items-center justify-between rounded-lg px-3 py-2 text-sm',
              toast.type === 'success'
                ? 'bg-success-muted text-success-foreground border border-success/20'
                : 'bg-destructive-muted text-destructive border border-destructive/20',
            )}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 shrink-0 rounded p-0.5 hover:bg-black/5 cursor-pointer"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
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

function Detail({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-foreground truncate hover:underline"
        >
          {value}
        </a>
      ) : (
        <p className="text-foreground truncate">{value}</p>
      )}
    </div>
  )
}
