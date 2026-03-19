'use client'

// ============================================================
// HomeClient — client shell for the home screen
//
// Handles the service domain selection state.
// When the booking search flow is built (Phase 4),
// the "搜尋設計師" button will navigate to /search?domain=nails|lashes
// ============================================================

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

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

export default function HomeClient({ firstName }: { firstName: string }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Domain | null>(null)

  function handleSearch() {
    if (!selected) return
    // Phase 4: navigate to /search?domain=selected
    router.push(`/search?domain=${selected}`)
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

        {/* Avatar placeholder — will link to profile/settings later */}
        <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
          <span className="text-sm font-semibold text-muted-foreground">
            {firstName.charAt(0).toUpperCase()}
          </span>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────── */}
      <div className="px-5 space-y-8">

        {/* Service type selector */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            你想預約什麼？
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {DOMAINS.map(d => (
              <button
                key={d.value}
                onClick={() => setSelected(d.value)}
                className={[
                  'rounded-2xl border-2 p-5 text-left transition-all',
                  selected === d.value
                    ? 'border-foreground bg-foreground text-primary-foreground'
                    : 'border-border bg-card text-foreground hover:border-foreground/30',
                ].join(' ')}
              >
                <span className="block text-2xl mb-2">{d.emoji}</span>
                <span className="block text-base font-bold">{d.label}</span>
                <span className={[
                  'block text-xs mt-0.5',
                  selected === d.value ? 'text-primary-foreground/70' : 'text-muted-foreground',
                ].join(' ')}>
                  {d.desc}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Search CTA */}
        <Button
          onClick={handleSearch}
          disabled={!selected}
          className="h-14 w-full rounded-2xl text-base font-semibold"
        >
          搜尋設計師
        </Button>


      </div>
    </main>
  )
}
