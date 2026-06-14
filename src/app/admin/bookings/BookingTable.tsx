'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

type BookingRow = {
  id: string
  user_id: string
  pro_id: string
  status: string
  price_min: number
  price_max: number
  created_at: string
  cancelled_at: string | null
  completed_at: string | null
  no_show_reported_at: string | null
  cancellation_actor: string | null
  no_show_reporter: string | null
  session_ends_at: string
  early_completion: boolean
}

export function BookingTable({
  bookings,
  proNames,
  userNames,
}: {
  bookings: BookingRow[]
  proNames: Record<string, string>
  userNames: Record<string, string>
}) {
  const [cancelling, setCancelling] = useState<string | null>(null)

  async function handleAdminCancel(bookingId: string) {
    if (!confirm('Cancel this booking? This will flag the appropriate party.')) return
    setCancelling(bookingId)
    try {
      const res = await fetch('/api/admin/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        alert(`Failed to cancel: ${error}`)
      } else {
        window.location.reload()
      }
    } finally {
      setCancelling(null)
    }
  }

  if (bookings.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
        No bookings match this filter.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Booking</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Customer</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Pro</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Price</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Created</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map(b => (
            <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/20">
              <td className="px-4 py-2">
                <p className="font-mono text-xs text-muted-foreground">{b.id.slice(0, 8)}</p>
              </td>
              <td className="px-4 py-2">{userNames[b.user_id] ?? b.user_id.slice(0, 8)}</td>
              <td className="px-4 py-2">{proNames[b.pro_id] ?? b.pro_id.slice(0, 8)}</td>
              <td className="px-4 py-2">
                <BookingStatusBadge status={b.status} />
              </td>
              <td className="px-4 py-2 text-muted-foreground">
                ${b.price_min}–${b.price_max}
              </td>
              <td className="px-4 py-2 text-muted-foreground text-xs">
                {new Date(b.created_at).toLocaleDateString('zh-TW')}
              </td>
              <td className="px-4 py-2">
                {b.status === 'confirmed' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleAdminCancel(b.id)}
                    disabled={cancelling === b.id}
                  >
                    Cancel
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BookingStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    confirmed: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled_grace: 'bg-gray-100 text-gray-600',
    cancelled_customer: 'bg-orange-100 text-orange-800',
    cancelled_pro: 'bg-red-100 text-red-800',
    no_show_customer: 'bg-red-100 text-red-800',
    no_show_pro: 'bg-red-100 text-red-800',
    reschedule_pending: 'bg-yellow-100 text-yellow-800',
    rescheduled: 'bg-purple-100 text-purple-800',
    expired: 'bg-gray-100 text-gray-600',
  }
  const label = status.replace(/_/g, ' ')
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? 'bg-gray-100 text-gray-800'}`}>
      {label}
    </span>
  )
}
