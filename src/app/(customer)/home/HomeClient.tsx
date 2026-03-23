'use client'

// ============================================================
// HomeClient — client shell for the home screen
//
// State A: no upcoming bookings → 美甲/美睫 CTA only
// State B: has bookings → compact booking cards + CTA below
// ============================================================

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import BookingCardCompact from '@/components/booking/BookingCardCompact'

export type UpcomingBooking = {
  id: string
  startsAt: string
  sessionEndsAt: string
  proName: string
  studioAddress: string
  serviceSummary: string
}

type Domain = 'nails' | 'lashes'

const DOMAINS: { value: Domain; label: string; emoji: string; desc: string }[] = [
  {
    value: 'nails',
    label: '美甲',
    emoji: '💅',
    desc: '凝膠 · 光療 · 手繪 · 藝術',
  },
  {
    value: 'lashes',
    label: '美睫',
    emoji: '✨',
    desc: '接睫 · 燙睫 · 霧眉',
  },
]

type Props = {
  firstName: string
  upcomingBookings: UpcomingBooking[]
}

export default function HomeClient({ firstName, upcomingBookings }: Props) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  function handleDomainSelect(domain: Domain) {
    router.push(`/book?domain=${domain}`)
  }

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <main className="min-h-screen bg-background">

      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 pt-12 pb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            歡迎回來
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {firstName} 👋
          </h1>
        </div>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="h-9 px-3 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-muted-foreground hover:bg-secondary/80 transition-colors"
        >
          {loggingOut ? '...' : '登出'}
        </button>
      </header>

      {/* ── Body ────────────────────────────────────────────── */}
      <div className="px-5 space-y-8">

        {/* Upcoming booking cards (State B) */}
        {upcomingBookings.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">
              即將到來的預約
            </h2>
            {upcomingBookings.map(b => (
              <BookingCardCompact key={b.id} booking={b} />
            ))}
          </section>
        )}

        {/* Service type selector (always visible) */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            你想預約什麼？
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {DOMAINS.map(d => (
              <Button
                key={d.value}
                variant="outline"
                onClick={() => handleDomainSelect(d.value)}
                className="h-auto rounded-2xl border-2 p-5 text-left flex flex-col items-start border-border bg-card text-foreground hover:border-foreground/30"
              >
                <span className="block text-2xl mb-2">{d.emoji}</span>
                <span className="block text-base font-bold">{d.label}</span>
                <span className="block text-xs mt-0.5 text-muted-foreground">
                  {d.desc}
                </span>
              </Button>
            ))}
          </div>
        </section>

      </div>
    </main>
  )
}
