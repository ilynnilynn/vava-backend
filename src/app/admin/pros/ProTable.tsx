'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

type ProRow = {
  id: string
  display_name: string
  phone: string
  ig_handle: string
  studio_address: string
  studio_district: string | null
  is_approved: boolean
  is_suspended: boolean
  is_accepting: boolean
  standing: string
  subscription_status: string
  confirmed_booking_count: number
  verification_status: string
  submitted_at: string | null
  reviewed_at: string | null
  created_at: string
}

export function ProTable({
  pros,
  flagCounts,
}: {
  pros: ProRow[]
  flagCounts: Record<string, number>
}) {
  const [actionPending, setActionPending] = useState<string | null>(null)

  async function handleSuspend(proId: string) {
    if (!confirm('Suspend this pro? They will not be able to accept bookings.')) return
    setActionPending(proId)
    try {
      const res = await fetch('/api/admin/pros/suspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proId }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        alert(`Failed to suspend: ${error}`)
      } else {
        window.location.reload()
      }
    } finally {
      setActionPending(null)
    }
  }

  async function handleUnsuspend(proId: string) {
    if (!confirm('Unsuspend this pro? They will regain access.')) return
    setActionPending(proId)
    try {
      const res = await fetch('/api/admin/pros/unsuspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proId }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        alert(`Failed to unsuspend: ${error}`)
      } else {
        window.location.reload()
      }
    } finally {
      setActionPending(null)
    }
  }

  if (pros.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
        No pros match this filter.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Name</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">IG</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">District</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Standing</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Flags</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Bookings</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {pros.map(pro => (
            <tr key={pro.id} className="border-b border-border last:border-0 hover:bg-muted/20">
              <td className="px-4 py-2">
                <div>
                  <p className="font-medium">{pro.display_name}</p>
                  <p className="text-xs text-muted-foreground">{pro.phone}</p>
                </div>
              </td>
              <td className="px-4 py-2 text-muted-foreground">@{pro.ig_handle}</td>
              <td className="px-4 py-2 text-muted-foreground">{pro.studio_district ?? '—'}</td>
              <td className="px-4 py-2">
                <ProStatusBadge pro={pro} />
              </td>
              <td className="px-4 py-2">
                <StandingBadge standing={pro.standing} />
              </td>
              <td className="px-4 py-2 text-center">{flagCounts[pro.id] ?? 0}</td>
              <td className="px-4 py-2">{pro.confirmed_booking_count}</td>
              <td className="px-4 py-2">
                {pro.is_suspended ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnsuspend(pro.id)}
                    disabled={actionPending === pro.id}
                  >
                    Unsuspend
                  </Button>
                ) : pro.is_approved ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleSuspend(pro.id)}
                    disabled={actionPending === pro.id}
                  >
                    Suspend
                  </Button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ProStatusBadge({ pro }: { pro: ProRow }) {
  if (pro.is_suspended) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Suspended</span>
  }
  if (pro.is_approved) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        pro.is_accepting ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
      }`}>
        {pro.is_accepting ? 'Accepting' : 'Approved'}
      </span>
    )
  }
  if (pro.verification_status === 'pending') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>
  }
  if (pro.verification_status === 'declined') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Declined</span>
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Draft</span>
}

function StandingBadge({ standing }: { standing: string }) {
  const styles: Record<string, string> = {
    good: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    at_risk: 'bg-orange-100 text-orange-800',
    suspended: 'bg-red-100 text-red-800',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[standing] ?? 'bg-gray-100 text-gray-800'}`}>
      {standing.replace('_', ' ')}
    </span>
  )
}
