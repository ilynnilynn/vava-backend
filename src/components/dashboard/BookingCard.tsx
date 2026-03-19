'use client'

import { useState } from 'react'
import type { Booking, BookingStatus } from '@/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { completeBookingAction, markNoShowAction, cancelBookingAction } from '@/app/pro/(auth)/dashboard/actions'

// ── Status badge ────────────────────────────────────────────

const statusLabels: Record<BookingStatus, string> = {
  confirmed: '已確認',
  reschedule_pending: '改期中',
  rescheduled: '已改期',
  cancelled_grace: '已取消',
  cancelled_customer: '顧客取消',
  cancelled_pro: '設計師取消',
  completed: '已完成',
  no_show_customer: '顧客未到',
  no_show_pro: '設計師未到',
  expired: '已過期',
}

const statusColors: Record<BookingStatus, string> = {
  confirmed: 'bg-green-100 text-green-800',
  reschedule_pending: 'bg-yellow-100 text-yellow-800',
  rescheduled: 'bg-blue-100 text-blue-800',
  cancelled_grace: 'bg-gray-100 text-gray-600',
  cancelled_customer: 'bg-gray-100 text-gray-600',
  cancelled_pro: 'bg-gray-100 text-gray-600',
  completed: 'bg-blue-100 text-blue-800',
  no_show_customer: 'bg-red-100 text-red-800',
  no_show_pro: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-400',
}

// ── Time helpers ────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  })
}

// ── Component ───────────────────────────────────────────────

type Props = {
  booking: Booking
  customerName?: string
  serviceSummary?: string
  /** Hide action buttons (for history view) */
  readOnly?: boolean
}

export function BookingCard({
  booking,
  customerName = '顧客',
  serviceSummary = '服務',
  readOnly = false,
}: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [now] = useState(() => Date.now())

  const startsAt = new Date(booking.starts_at).getTime()
  const endsAt = new Date(booking.session_ends_at).getTime()
  const noShowActivatesAt = startsAt + booking.no_show_window_minutes * 60 * 1000

  const isActive = booking.status === 'confirmed'
  const isDuringSession = now >= startsAt && now <= endsAt
  const canComplete = isActive && isDuringSession
  const canMarkNoShow = isActive && now >= noShowActivatesAt
  const canCancel = isActive

  async function handleAction(
    action: () => Promise<{ error: string | null }>,
    key: string
  ) {
    setLoading(key)
    setError(null)
    const result = await action()
    if (result.error) setError(result.error)
    setLoading(null)
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{customerName}</p>
          <p className="text-sm text-muted-foreground">{serviceSummary}</p>
        </div>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            statusColors[booking.status]
          )}
        >
          {statusLabels[booking.status]}
        </span>
      </div>

      {/* Time */}
      <p className="text-sm">
        {formatDate(booking.starts_at)}{' '}
        {formatTime(booking.starts_at)} — {formatTime(booking.session_ends_at)}
      </p>

      {/* Customer note */}
      {booking.customer_note && (
        <p className="text-sm text-muted-foreground">
          備註：{booking.customer_note}
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Actions */}
      {!readOnly && isActive && (
        <div className="flex flex-wrap gap-2 pt-1">
          {canComplete && (
            <Button
              size="sm"
              onClick={() =>
                handleAction(
                  () => completeBookingAction(booking.id),
                  'complete'
                )
              }
              disabled={loading !== null}
            >
              {loading === 'complete' ? '處理中...' : '結束服務'}
            </Button>
          )}

          {canMarkNoShow && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                handleAction(
                  () => markNoShowAction(booking.id),
                  'noshow'
                )
              }
              disabled={loading !== null}
            >
              {loading === 'noshow' ? '處理中...' : '客戶未到場'}
            </Button>
          )}

          {canCancel && (
            <CancelButton
              bookingId={booking.id}
              loading={loading}
              onAction={handleAction}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ── Cancel with confirmation ────────────────────────────────

function CancelButton({
  bookingId,
  loading,
  onAction,
}: {
  bookingId: string
  loading: string | null
  onAction: (
    action: () => Promise<{ error: string | null }>,
    key: string
  ) => void
}) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div className="flex flex-col gap-2 w-full">
        <p className="text-sm text-destructive">
          取消後將影響您的排名與接單優先順序，確定取消？
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              onAction(() => cancelBookingAction(bookingId), 'cancel')
              setConfirming(false)
            }}
            disabled={loading !== null}
          >
            {loading === 'cancel' ? '取消中...' : '確定取消'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirming(false)}
            disabled={loading !== null}
          >
            返回
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-destructive"
      onClick={() => setConfirming(true)}
      disabled={loading !== null}
    >
      取消預約
    </Button>
  )
}
