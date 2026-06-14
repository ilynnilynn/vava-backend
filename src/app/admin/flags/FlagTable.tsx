'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

type FlagRow = {
  id: string
  booking_id: string
  flagged_entity: string
  flagged_id: string
  flag_type: string
  is_same_day: boolean
  note: string | null
  created_at: string
}

export function FlagTable({
  flags,
  entityNames,
  proStandings,
  flagCountByEntity,
}: {
  flags: FlagRow[]
  entityNames: Record<string, string>
  proStandings: Record<string, { standing: string; is_suspended: boolean }>
  flagCountByEntity: Record<string, number>
}) {
  const [actionPending, setActionPending] = useState<string | null>(null)

  async function handleSuspendPro(proId: string) {
    if (!confirm('Suspend this pro based on their flags?')) return
    setActionPending(proId)
    try {
      const res = await fetch('/api/admin/pros/suspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proId }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        alert(`Failed: ${error}`)
      } else {
        window.location.reload()
      }
    } finally {
      setActionPending(null)
    }
  }

  if (flags.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
        No flags found.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Entity</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Name</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Type</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Same Day</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Total Flags</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Note</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {flags.map(f => {
            const proInfo = f.flagged_entity === 'pro' ? proStandings[f.flagged_id] : null
            return (
              <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-4 py-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    f.flagged_entity === 'pro' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {f.flagged_entity}
                  </span>
                </td>
                <td className="px-4 py-2 font-medium">
                  {entityNames[f.flagged_id] ?? f.flagged_id.slice(0, 8)}
                </td>
                <td className="px-4 py-2">
                  <FlagTypeBadge type={f.flag_type} />
                </td>
                <td className="px-4 py-2 text-center">{f.is_same_day ? 'Yes' : '—'}</td>
                <td className="px-4 py-2 text-center">{flagCountByEntity[f.flagged_id] ?? 0}</td>
                <td className="px-4 py-2 text-muted-foreground text-xs max-w-[200px] truncate">
                  {f.note ?? '—'}
                </td>
                <td className="px-4 py-2 text-muted-foreground text-xs">
                  {new Date(f.created_at).toLocaleDateString('zh-TW')}
                </td>
                <td className="px-4 py-2">
                  {f.flagged_entity === 'pro' && proInfo && !proInfo.is_suspended && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleSuspendPro(f.flagged_id)}
                      disabled={actionPending === f.flagged_id}
                    >
                      Suspend
                    </Button>
                  )}
                  {f.flagged_entity === 'pro' && proInfo?.is_suspended && (
                    <span className="text-xs text-red-600 font-medium">Suspended</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function FlagTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    soft: 'bg-yellow-100 text-yellow-800',
    hard: 'bg-orange-100 text-orange-800',
    no_show: 'bg-red-100 text-red-800',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[type] ?? 'bg-gray-100 text-gray-800'}`}>
      {type.replace('_', ' ')}
    </span>
  )
}
