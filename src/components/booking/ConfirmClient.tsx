'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

type Props = {
  proId: string
  proName: string
  studioAddress: string
  slotId: string
  startsAt: string
  durationMinutes: number
  noShowWindowMinutes: number
  serviceSummary: string
  serviceIds: string[]
  startingPrice: number
  dateTime: string
  wizardParams: Record<string, string | undefined>
}

export default function ConfirmClient({
  proId,
  proName,
  studioAddress,
  slotId,
  startsAt,
  durationMinutes,
  noShowWindowMinutes,
  serviceSummary,
  serviceIds,
  startingPrice,
  dateTime,
  wizardParams,
}: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    if (submitting) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/bookings/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proId,
          slotId,
          startsAt,
          durationMinutes,
          noShowWindowMinutes,
          priceMin: startingPrice,
          priceMax: startingPrice,
          serviceCategoryIds: serviceIds,
          styleId: wizardParams.styleId ?? null,
          lashDensity: wizardParams.density ?? null,
          lashSpecialFiberTagId: wizardParams.fiberTagId ?? null,
          lashStyleTags: wizardParams.styleTags?.split(',') ?? null,
          addonIds: wizardParams.addons?.split(',') ?? null,
          treatmentTier: wizardParams.treatmentTier ?? null,
          fillInDays: wizardParams.fillInDays ? parseInt(wizardParams.fillInDays, 10) : null,
          preference: wizardParams.silent === '1' ? ['no_conversation'] : null,
          customerNote: wizardParams.note ?? null,
          briefingRefPhotoUrl: wizardParams.refPhoto ?? null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? '預約失敗，請稍後再試')
        setSubmitting(false)
        return
      }

      // Navigate to success page
      router.push(`/book/success?bookingId=${data.booking.id}`)
    } catch {
      setError('網路錯誤，請稍後再試')
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="px-5 pt-12 pb-4">
        <button
          onClick={() => router.back()}
          className="text-xs text-muted-foreground"
        >
          ← 返回
        </button>
        <h1 className="mt-2 text-xl font-bold text-foreground">確認預約</h1>
      </header>

      <div className="px-5 space-y-5 pb-32">
        {/* Summary card */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
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
            <p className="text-xs text-muted-foreground">時長</p>
            <p className="text-sm text-foreground">{durationMinutes} 分鐘</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">地點</p>
            <p className="text-sm text-foreground">{studioAddress}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">預估費用</p>
            <p className="text-sm font-medium text-foreground">
              NT${startingPrice.toLocaleString()} 起
            </p>
          </div>
        </div>

        {/* Payment note */}
        <p className="text-xs text-muted-foreground">
          實際費用將於服務結束後由設計師確認
        </p>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-destructive-muted px-4 py-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-5">
        <Button
          onClick={handleConfirm}
          disabled={submitting}
          className="h-14 w-full rounded-2xl text-base font-semibold"
        >
          {submitting ? '預約中...' : '確認預約'}
        </Button>
      </div>
    </main>
  )
}
