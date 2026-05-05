'use client'

import { useState } from 'react'

const DECLINE_REASONS = [
  'ID photo is unclear',
  'ID does not match submitted name',
  'Missing required information',
  'Invalid phone number',
  'Missing or invalid portfolio',
  'Business information incomplete',
  'Other',
] as const

export function DeclineModal({
  proId,
  proName,
  onClose,
  onDeclined,
}: {
  proId: string
  proName: string
  onClose: () => void
  onDeclined: () => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleReason(reason: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(reason)) next.delete(reason)
      else next.add(reason)
      return next
    })
  }

  async function handleSubmit() {
    if (selected.size === 0) {
      setError('Select at least one reason')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/pros/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proId,
          reasons: Array.from(selected),
          note: note.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to decline')
      }

      onDeclined()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline')
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-4 rounded-xl bg-white p-6 shadow-xl space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold">
          Decline {proName}
        </h3>

        <p className="text-sm text-muted-foreground">
          Select the reasons for declining:
        </p>

        <div className="space-y-2">
          {DECLINE_REASONS.map(reason => (
            <label key={reason} className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.has(reason)}
                onChange={() => toggleReason(reason)}
                className="mt-0.5 h-4 w-4 rounded border-border"
              />
              <span className="text-sm">{reason}</span>
            </label>
          ))}
        </div>

        {selected.has('Other') && (
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Additional notes..."
            className="w-full rounded-lg border border-border px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        )}

        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || selected.size === 0}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Declining...' : 'Confirm Decline'}
          </button>
        </div>
      </div>
    </div>
  )
}
