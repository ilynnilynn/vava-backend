'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

type Props = {
  bookingId: string
  proName: string
  studioAddress: string
  serviceSummary: string
  dateTime: string
  createdAt: string
}

const GRACE_PERIOD_MS = 10 * 60 * 1000 // 10 minutes

export default function SuccessClient({
  bookingId,
  proName,
  studioAddress,
  serviceSummary,
  dateTime,
  createdAt,
}: Props) {
  const router = useRouter()
  const [cancelling, setCancelling] = useState(false)
  const [isGracePeriod, setIsGracePeriod] = useState(true)

  // Check grace period on mount and update periodically
  useEffect(() => {
    function check() {
      const elapsed = Date.now() - new Date(createdAt).getTime()
      setIsGracePeriod(elapsed < GRACE_PERIOD_MS)
    }
    check()
    const interval = setInterval(check, 10_000) // check every 10s
    return () => clearInterval(interval)
  }, [createdAt])

  async function handleCancel() {
    if (cancelling) return
    setCancelling(true)
    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      })
      if (res.ok) {
        router.push('/home')
      } else {
        setCancelling(false)
      }
    } catch {
      setCancelling(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="px-5 pt-16 pb-8 text-center">
        <p className="text-4xl mb-3">🎉</p>
        <h1 className="text-2xl font-bold text-foreground">預約成功！</h1>
      </div>

      {/* Booking summary */}
      <div className="mx-5 rounded-2xl border border-border bg-card p-5 space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">設計師</p>
          <p className="text-base font-semibold text-foreground">{proName}</p>
        </div>

        {serviceSummary && (
          <div>
            <p className="text-xs text-muted-foreground">服務</p>
            <p className="text-sm text-foreground">{serviceSummary}</p>
          </div>
        )}

        <div>
          <p className="text-xs text-muted-foreground">時間</p>
          <p className="text-sm text-foreground">{dateTime}</p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">地點</p>
          <p className="text-sm text-foreground">{studioAddress}</p>
        </div>
      </div>

      {/* Grace period cancel */}
      <div className="px-5 mt-6 space-y-3">
        {isGracePeriod ? (
          <>
            <p className="text-xs text-muted-foreground text-center">
              臨時改變主意？10分鐘內
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="text-foreground font-medium underline ml-0.5"
              >
                {cancelling ? '取消中...' : '免責取消'}
              </button>
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground text-center">
            免責取消時段已過。如需取消，請前往預約詳情頁面。
          </p>
        )}
      </div>

      {/* Back to home */}
      <div className="px-5 mt-8">
        <Button
          onClick={() => router.push('/home')}
          variant="outline"
          className="h-12 w-full rounded-2xl text-sm font-medium"
        >
          回到首頁
        </Button>
      </div>
    </main>
  )
}
