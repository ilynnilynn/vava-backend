'use client'

import { useState } from 'react'
import type { Pro, Booking } from '@/types'
import { AcceptingToggle } from '@/components/dashboard/AcceptingToggle'
import { BookingCard } from '@/components/dashboard/BookingCard'
import Link from 'next/link'
import { CalendarClock } from 'lucide-react'

type Props = {
  pro: Pro
  bookings: Booking[]
}

export function HomeContent({ pro, bookings }: Props) {
  const [now] = useState(() => Date.now())

  const today = new Date(now).toDateString()
  const in72hr = now + 72 * 60 * 60 * 1000

  const todayBookings = bookings.filter(
    (b) =>
      new Date(b.starts_at).toDateString() === today &&
      b.status === 'confirmed'
  )

  const upcomingBookings = bookings.filter((b) => {
    const t = new Date(b.starts_at).getTime()
    return (
      b.status === 'confirmed' &&
      new Date(b.starts_at).toDateString() !== today &&
      t > now &&
      t <= in72hr
    )
  })

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">
          {pro.display_name}
        </h1>
        {pro.subscription_status === 'free' && (
          <p className="text-sm text-muted-foreground">
            免費體驗 {pro.confirmed_booking_count}/10 筆預約
          </p>
        )}
      </div>

      {/* Accepting toggle */}
      <AcceptingToggle initialValue={pro.is_accepting} />

      {/* Today's bookings */}
      <section className="space-y-3">
        <h2 className="font-semibold">今日預約</h2>
        {todayBookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            今天沒有預約
          </p>
        ) : (
          todayBookings.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))
        )}
      </section>

      {/* Upcoming bookings */}
      <section className="space-y-3">
        <h2 className="font-semibold">即將到來</h2>
        {upcomingBookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            72 小時內沒有其他預約
          </p>
        ) : (
          upcomingBookings.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))
        )}
      </section>

      {/* Shortcut to slots */}
      <Link
        href="/dashboard/slots"
        className="flex items-center gap-2 rounded-lg border p-4 text-sm font-medium hover:bg-accent transition-colors"
      >
        <CalendarClock className="h-5 w-5 text-primary" />
        管理可預約時段
      </Link>
    </div>
  )
}
