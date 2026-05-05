'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

type RatingFormProps = {
  token: string
}

export default function RatingForm({ token }: RatingFormProps) {
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (stars === 0 || submitting) return
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch(`/api/ratings/submit?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stars,
          comment: comment.trim() || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? '提交失敗，請稍後再試')
        setSubmitting(false)
        return
      }

      setSuccess(true)
    } catch {
      setError('網路錯誤，請稍後再試')
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="mt-8 text-center">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-success-muted mb-4">
          <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-foreground">
          感謝您的評價！
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          您的回饋將幫助其他顧客找到優秀的設計師
        </p>
        <Button asChild className="mt-6 h-12 w-full rounded-2xl text-base font-semibold">
          <Link href="/bookings">查看所有預約</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Star picker */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">服務評分</p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStars(s)}
              className="p-1 transition-transform active:scale-90"
              aria-label={`${s} 顆星`}
            >
              <span className={`text-4xl ${s <= stars ? 'text-star' : 'text-border'}`}>
                ★
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Comment */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          留言（選填）
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="分享您的體驗..."
          rows={3}
          maxLength={500}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none resize-none"
        />
        <p className="text-xs text-muted-foreground text-right">
          {comment.length}/500
        </p>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={stars === 0 || submitting}
        className="h-14 w-full rounded-2xl text-base font-semibold"
      >
        {submitting ? '提交中...' : '提交評價'}
      </Button>
    </div>
  )
}
