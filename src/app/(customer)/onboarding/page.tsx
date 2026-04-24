'use client'

// ============================================================
// /onboarding — Customer profile setup (2-step wizard)
//
// Step 1: phone number only
// Step 2: birth year only
//
// One question per screen — button activates as soon as
// the field is valid. No "fill everything first" friction.
//
// On final submit → POST /api/user/onboard → redirect /home
// ============================================================

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

const PHONE_REGEX = /^09\d{8}$/

const currentYear = new Date().getFullYear()
// Newest year first (youngest valid age = 16), oldest = 1950
const YEARS = Array.from(
  { length: currentYear - 1950 - 15 },
  (_, i) => currentYear - 16 - i
)

export default function OnboardingPage() {
  const router = useRouter()

  const [step,      setStep]      = useState<1 | 2>(1)
  const [phone,     setPhone]     = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const phoneValid = PHONE_REGEX.test(phone)

  // ── Step 1 submit: just validate + advance ─────────────────
  function handlePhoneNext(e: React.FormEvent) {
    e.preventDefault()
    if (!phoneValid) return
    setError(null)
    setStep(2)
  }

  // ── Step 2 submit: save both fields ────────────────────────
  async function handleFinalSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!birthYear || loading) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/user/onboard', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phone, birth_year: Number(birthYear) }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? '設定失敗，請重試。')
        return
      }

      // Hard navigation — bypasses Next.js Router Cache so
      // /home server component re-runs and sees the freshly saved data.
      window.location.href = '/home'
    } catch {
      setError('網路異常，請稍後再試。')
    } finally {
      setLoading(false)
    }
  }

  // ── Shared layout wrapper ───────────────────────────────────
  return (
    <main className="flex min-h-screen flex-col px-6 bg-background">

      {/* Progress dots */}
      <div className="flex justify-center gap-2 pt-14 pb-10">
        {[1, 2].map(n => (
          <span
            key={n}
            className={[
              'h-1.5 rounded-full transition-all duration-300',
              step === n ? 'w-6 bg-foreground' : 'w-1.5 bg-border',
            ].join(' ')}
          />
        ))}
      </div>

      <div className="flex flex-1 flex-col justify-center">
        <div className="w-full max-w-sm mx-auto space-y-8">

          {/* ── STEP 1: Phone ─────────────────────────────── */}
          {step === 1 && (
            <form onSubmit={handlePhoneNext} className="space-y-8">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  你的手機號碼？
                </h1>
                <p className="text-sm text-muted-foreground">
                  設計師會透過此號碼與你聯繫
                </p>
              </div>

              <div className="space-y-2">
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="09XXXXXXXX"
                  value={phone}
                  onChange={e => setPhone(e.target.value.trim())}
                  maxLength={10}
                  autoComplete="tel"
                  autoFocus
                  className="h-14 text-lg tracking-wide"
                />
                {phone.length > 0 && !phoneValid && (
                  <p className="text-xs text-destructive">
                    請輸入 09 開頭的 10 碼號碼
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={!phoneValid}
                className="h-14 w-full rounded-2xl text-base font-semibold"
              >
                下一步
              </Button>
            </form>
          )}

          {/* ── STEP 2: Birth year ────────────────────────── */}
          {step === 2 && (
            <form onSubmit={handleFinalSubmit} className="space-y-8">
              <div className="space-y-1">
                {/* Back chevron */}
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← 返回
                </button>

                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  你的出生年份？
                </h1>
                <p className="text-sm text-muted-foreground">
                  幫助我們提供更合適的推薦
                </p>
              </div>

              <select
                value={birthYear}
                onChange={e => setBirthYear(e.target.value)}
                className="flex h-14 w-full rounded-2xl border border-input bg-background px-4 text-lg text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                autoFocus
              >
                <option value="" disabled>選擇年份</option>
                {YEARS.map(year => (
                  <option key={year} value={year}>{year} 年</option>
                ))}
              </select>

              {error && (
                <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={!birthYear || loading}
                className="h-14 w-full rounded-2xl text-base font-semibold"
              >
                {loading ? '儲存中⋯' : '開始使用 VAVA'}
              </Button>
            </form>
          )}

        </div>
      </div>

      {/* Logout link */}
      <div className="py-6 text-center">
        <button
          type="button"
          onClick={async () => {
            const supabase = createClient()
            await supabase.auth.signOut()
            router.replace('/login')
          }}
          className="text-xs text-muted-foreground underline underline-offset-2"
        >
          登出
        </button>
      </div>
    </main>
  )
}
