'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'

export function ApproveButton({ proId, proLineUserId }: { proId: string; proLineUserId: string }) {
  const [isPending, startTransition] = useTransition()
  const [approved, setApproved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleApprove() {
    setError(null)
    startTransition(async () => {
      const res = await fetch('/api/admin/pros/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proId, proLineUserId }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Failed to approve')
        return
      }

      setApproved(true)
    })
  }

  if (approved) {
    return <span className="text-xs font-medium text-success">Approved</span>
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" onClick={handleApprove} disabled={isPending}>
        {isPending ? 'Approving...' : 'Approve'}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}
