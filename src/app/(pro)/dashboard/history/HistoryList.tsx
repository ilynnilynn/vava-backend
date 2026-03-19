'use client'

import { useState } from 'react'
import type { Booking, BookingStatus } from '@/types'
import { BookingCard } from '@/components/dashboard/BookingCard'
import { Button } from '@/components/ui/button'

type StatusFilter = 'all' | 'completed' | 'cancelled' | 'no_show'

const filterLabels: Record<StatusFilter, string> = {
  all: '全部',
  completed: '已完成',
  cancelled: '已取消',
  no_show: '未到場',
}

const filterMatch: Record<StatusFilter, BookingStatus[] | null> = {
  all: null,
  completed: ['completed'],
  cancelled: ['cancelled_grace', 'cancelled_customer', 'cancelled_pro'],
  no_show: ['no_show_customer', 'no_show_pro'],
}

type Props = {
  bookings: Booking[]
}

export function HistoryList({ bookings }: Props) {
  const [filter, setFilter] = useState<StatusFilter>('all')

  const filtered = bookings.filter((b) => {
    const statuses = filterMatch[filter]
    if (!statuses) return true
    return statuses.includes(b.status)
  })

  // Sort newest first
  const sorted = [...filtered].sort(
    (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()
  )

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2">
        {(Object.keys(filterLabels) as StatusFilter[]).map((key) => (
          <Button
            key={key}
            size="sm"
            variant={filter === key ? 'default' : 'outline'}
            onClick={() => setFilter(key)}
          >
            {filterLabels[key]}
          </Button>
        ))}
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {filter === 'all' ? '還沒有預約紀錄' : '沒有符合篩選的紀錄'}
        </p>
      ) : (
        <div className="space-y-3">
          {sorted.map((b) => (
            <BookingCard key={b.id} booking={b} readOnly />
          ))}
        </div>
      )}
    </div>
  )
}
