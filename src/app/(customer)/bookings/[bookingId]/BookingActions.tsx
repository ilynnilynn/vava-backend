'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

type BookingActionsProps = {
  bookingId: string
  createdAt: string
  startsAt: string
  noShowWindowMinutes: number
  customerLateNotifiedAt: string | null
  proPhone: string | null
}

const GRACE_PERIOD_MS = 10 * 60 * 1000 // 10 minutes
const REVEAL_MINUTES = 10 // phone + late button revealed at −10 min

function getCancelSeverity(createdAt: string, startsAt: string): {
  label: string
  severity: 'grace' | 'soft' | 'hard'
} {
  const now = Date.now()
  const createdMs = new Date(createdAt).getTime()
  const startsMs = new Date(startsAt).getTime()
  const minutesUntil = (startsMs - now) / 60000
  const withinGrace = (now - createdMs) < GRACE_PERIOD_MS

  if (withinGrace) return { label: '免罰', severity: 'grace' }
  if (minutesUntil < 30) return { label: '嚴重違規', severity: 'hard' }
  return { label: '輕微違規', severity: 'soft' }
}

export default function BookingActions({
  bookingId,
  createdAt,
  startsAt,
  noShowWindowMinutes,
  customerLateNotifiedAt,
  proPhone,
}: BookingActionsProps) {
  const router = useRouter()
  const [showEditMenu, setShowEditMenu] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [confirmingNoShow, setConfirmingNoShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const now = Date.now()
  const startsMs = new Date(startsAt).getTime()
  const minutesUntil = (startsMs - now) / 60000
  const hasStarted = now >= startsMs

  // Pro phone + late button revealed at −10 min before starts_at
  const revealMs = startsMs - REVEAL_MINUTES * 60 * 1000
  const isRevealed = now >= revealMs

  const noShowActiveAt = startsMs + noShowWindowMinutes * 60 * 1000
  const canReportNoShow = now >= noShowActiveAt

  const cancelInfo = getCancelSeverity(createdAt, startsAt)

  async function handleCancel() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? '取消失敗')
        return
      }
      router.refresh()
    } catch {
      setError('網路錯誤，請稍後再試')
    } finally {
      setLoading(false)
      setConfirmingCancel(false)
    }
  }

  async function handleLate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/bookings/late', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? '通知失敗')
        return
      }
      router.refresh()
    } catch {
      setError('網路錯誤，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  async function handleNoShow() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/bookings/no-show', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? '回報失敗')
        return
      }
      router.refresh()
    } catch {
      setError('網路錯誤，請稍後再試')
    } finally {
      setLoading(false)
      setConfirmingNoShow(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Pro phone — revealed at −10 min before starts_at */}
      {isRevealed && proPhone && (
        <div className="rounded-xl border border-border bg-card px-4 py-3 flex justify-between items-center">
          <span className="text-sm text-muted-foreground">設計師電話</span>
          <a href={`tel:${proPhone}`} className="text-sm font-medium text-foreground underline">
            {proPhone}
          </a>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* 編輯預約 dropdown — before session starts */}
      {!hasStarted && !confirmingCancel && (
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setShowEditMenu(!showEditMenu)}
            className="w-full rounded-xl"
          >
            編輯預約
          </Button>

          {showEditMenu && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-border bg-card shadow-lg z-10 overflow-hidden">
              {/* Reschedule — only if > 2hr away */}
              {minutesUntil > 120 && (
                <button
                  onClick={() => {
                    setShowEditMenu(false)
                    router.push(`/bookings/${bookingId}/reschedule`)
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-secondary transition-colors border-b border-border"
                >
                  申請改期
                </button>
              )}
              <button
                onClick={() => {
                  setShowEditMenu(false)
                  setConfirmingCancel(true)
                }}
                className="w-full px-4 py-3 text-left text-sm text-destructive hover:bg-secondary transition-colors"
              >
                取消預約（{cancelInfo.label}）
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cancel confirmation */}
      {!hasStarted && confirmingCancel && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">確定要取消預約嗎？</p>
          <div className={`rounded-lg px-3 py-2 text-xs ${
            cancelInfo.severity === 'grace'
              ? 'bg-success-muted text-success-foreground'
              : cancelInfo.severity === 'soft'
              ? 'bg-warning-muted text-warning-foreground'
              : 'bg-destructive-muted text-destructive'
          }`}>
            {cancelInfo.severity === 'grace' && '預約後 10 分鐘內取消，不會產生違規紀錄。'}
            {cancelInfo.severity === 'soft' && '此取消將記錄為輕微違規，累積可能影響帳號狀態。'}
            {cancelInfo.severity === 'hard' && '距離開始不足 30 分鐘，此取消將記錄為嚴重違規。'}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmingCancel(false)}
              disabled={loading}
              className="flex-1 rounded-xl"
            >
              返回
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 rounded-xl"
            >
              {loading ? '取消中...' : '確認取消'}
            </Button>
          </div>
        </div>
      )}

      {/* Late arrival button — visible at −10 min before starts_at, stays through session */}
      {isRevealed && !customerLateNotifiedAt && (
        <Button
          variant="outline"
          onClick={handleLate}
          disabled={loading}
          className="w-full rounded-xl"
        >
          {loading ? '通知中...' : '我會晚到'}
        </Button>
      )}

      {isRevealed && customerLateNotifiedAt && (
        <p className="text-xs text-muted-foreground text-center">已通知設計師您會晚到</p>
      )}

      {/* No-show button — active after no_show_window */}
      {hasStarted && (
        <>
          {confirmingNoShow ? (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">確定要回報設計師未到場嗎？</p>
              <p className="text-xs text-muted-foreground">回報後將記錄為設計師未出席。</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setConfirmingNoShow(false)}
                  disabled={loading}
                  className="flex-1 rounded-xl"
                >
                  返回
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleNoShow}
                  disabled={loading}
                  className="flex-1 rounded-xl"
                >
                  {loading ? '回報中...' : '確認回報'}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setConfirmingNoShow(true)}
              disabled={!canReportNoShow || loading}
              className="w-full rounded-xl"
            >
              {canReportNoShow ? '設計師未到場' : `設計師未到場（${noShowWindowMinutes} 分鐘後可回報）`}
            </Button>
          )}
        </>
      )}
    </div>
  )
}
