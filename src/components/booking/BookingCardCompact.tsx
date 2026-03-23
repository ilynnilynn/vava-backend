'use client'

import Link from 'next/link'
import type { UpcomingBooking } from '@/app/(customer)/home/HomeClient'

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hours = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')
  return `${month}/${day} ${hours}:${mins}`
}

export default function BookingCardCompact({ booking }: { booking: UpcomingBooking }) {
  return (
    <Link
      href={`/bookings/${booking.id}`}
      className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-secondary/50"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">
            {booking.proName}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground truncate">
            {booking.serviceSummary}
          </p>
        </div>
        <span className="ml-3 shrink-0 rounded-full bg-success-muted px-2 py-0.5 text-[10px] font-medium text-success-foreground">
          已確認
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <span>{formatDateTime(booking.startsAt)}</span>
        <span className="truncate">{booking.studioAddress}</span>
      </div>
    </Link>
  )
}
