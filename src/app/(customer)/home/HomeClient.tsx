'use client'

// ============================================================
// HomeClient — Customer home screen
//
// Matches Figma: "Final" page → "Home" frame (421:843)
// Layout: Nav → Hero header → Request card → Available Now → Model CTA → BottomNav pad
// ============================================================

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Search, ChevronDown, ChevronRight } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type UpcomingBooking = {
  id: string
  startsAt: string
  sessionEndsAt: string
  proName: string
  studioAddress: string
  serviceSummary: string
}

export type ProCounts = {
  nails: number
  lashes: number
  makeup: number
}

type Props = {
  upcomingBookings: UpcomingBooking[]
  proCounts: ProCounts
}

// ─── VAVA Logo SVG ────────────────────────────────────────────────────────────

function VavaIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      width="29"
      height="24"
      viewBox="0 0 29 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-label="VAVA"
    >
      <path
        d="M28.852 19.7027C28.5275 17.5998 26.8072 15.3359 25.4146 13.8077C24.9199 13.2646 24.4095 12.7436 23.899 12.2637C26.2653 10.7039 30.0998 7.99159 28.5118 4.81832C28.4771 4.75201 28.4456 4.6857 28.4141 4.62887C27.9824 3.89002 27.3176 3.3943 26.5016 3.20169C25.3894 2.93962 23.981 3.25852 22.8278 4.02895C21.1925 5.12459 20.0488 6.83911 19.5793 8.84411C19.2958 8.6736 19.0185 8.5031 18.7444 8.32628C18.486 8.16209 18.423 8.11789 18.1552 7.96317L17.2068 9.62085L17.0367 9.92081L16.7374 10.4386C16.9579 10.5713 16.9768 10.5744 17.1974 10.7039C17.3833 10.827 17.5692 10.9407 17.7551 11.0449C17.9977 11.1933 18.234 11.3227 18.4451 11.468C18.5585 11.5406 18.6719 11.6227 18.7917 11.7111C17.7141 12.1026 16.4916 12.2731 16.1765 11.8753C16.1576 11.8595 16.1419 11.8342 16.1261 11.809C15.8173 11.2722 16.2395 10.0629 17.2131 8.65782C18.8736 6.28655 20.4049 5.00461 22.4465 3.60585C22.6671 3.4606 22.894 3.32167 23.146 3.17643C23.2752 3.10381 23.3949 3.03118 23.5273 2.94909L23.606 2.90173L24.3622 2.46284L24.0534 1.93238L23.1775 0.413631L22.9412 0C22.8845 0 21.5738 0.836733 21.4509 0.909355C21.1768 1.07354 20.8901 1.29457 20.6223 1.48086C19.9826 1.92606 18.6404 2.87647 16.7594 4.74254C15.956 5.54138 15.1242 6.6244 14.4562 7.76425C13.7914 6.6244 12.9564 5.54138 12.1561 4.74254C10.2751 2.87647 8.92977 1.92606 8.29016 1.48086C8.02235 1.29457 7.73878 1.07354 7.46151 0.909355C7.34178 0.836733 6.02791 0 5.9712 0L5.73489 0.413631L4.86213 1.93238L4.55336 2.46284L5.30639 2.90173L5.38831 2.94909C5.51749 3.03118 5.64037 3.10381 5.76955 3.17643C6.01846 3.32167 6.24532 3.4606 6.46587 3.60585C8.50756 5.00461 10.0388 6.28655 11.7024 8.65782C12.6729 10.0629 13.0951 11.2722 12.7863 11.809C12.7705 11.8342 12.7548 11.8595 12.739 11.8753C12.424 12.2731 11.1983 12.1026 10.1208 11.7111C10.2436 11.6227 10.3571 11.5406 10.4705 11.468C10.6784 11.3227 10.9147 11.1933 11.1574 11.0449C11.3433 10.9407 11.5323 10.827 11.7182 10.7039C11.9356 10.5744 11.9576 10.5713 12.1751 10.4386L11.8757 9.92081L11.7056 9.62085L10.7572 7.96317C10.4894 8.11789 10.4295 8.16209 10.168 8.32628C9.8939 8.5031 9.61978 8.6736 9.33306 8.84411C8.8636 6.83911 7.72302 5.12459 6.08463 4.02895C4.9346 3.25852 3.52305 2.93962 2.41399 3.20169C1.59479 3.3943 0.929976 3.89002 0.501472 4.62887C0.466814 4.6857 0.435305 4.75201 0.403798 4.81832C-1.18419 7.99159 2.64714 10.7039 5.01337 12.2637C4.50294 12.7436 3.99252 13.2646 3.49785 13.8077C2.10521 15.3359 0.388043 17.5998 0.0635147 19.7027C-0.00265137 20.0942 -0.100324 21.1015 0.265165 21.9635C0.331331 22.1087 0.403798 22.2476 0.476265 22.3771C1.96658 24.9662 5.37255 23.8232 6.85341 23.2359L9.42444 22.0519C9.51266 22.0013 9.61978 21.9445 9.69855 21.9066C9.84664 21.8308 9.98212 21.7582 10.0892 21.6951L10.2909 21.5561C11.5165 20.751 13.2967 19.5827 14.4562 18.165C15.6157 19.5827 17.3959 20.751 18.6215 21.5561L18.8263 21.6951C18.9303 21.7582 19.0689 21.8308 19.2139 21.9066C19.2958 21.9445 19.3998 22.0013 19.4911 22.0519L22.059 23.2359C23.543 23.8232 26.9458 24.9662 28.4362 22.3771C28.5118 22.2476 28.5842 22.1087 28.6473 21.9635C29.0127 21.1015 28.9151 20.0942 28.852 19.7027Z"
        fill="#F9583B"
      />
    </svg>
  )
}

// ─── Category cards ────────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    key: 'nails',
    label: '美甲師',
    image: '/images/home/nails.png',
    href: '/search?category=nails',
  },
  {
    key: 'lashes',
    label: '美睫師',
    image: '/images/home/lashes.png',
    href: '/search?category=lashes',
  },
  {
    key: 'makeup',
    label: '美妝師',
    image: '/images/home/makeup.png',
    href: '/search?category=makeup',
  },
] as const

const ROTATING_WORDS = ['美甲', '美睫', '美妝']

// ─── Main component ────────────────────────────────────────────────────────────

export default function HomeClient({ upcomingBookings, proCounts }: Props) {
  const router = useRouter()
  const [wordIdx, setWordIdx] = useState(0)
  const [wordVisible, setWordVisible] = useState(true)

  // Rotate the headline service word every 2.5 s with a brief fade
  useEffect(() => {
    const id = setInterval(() => {
      setWordVisible(false)
      const t = setTimeout(() => {
        setWordIdx(i => (i + 1) % ROTATING_WORDS.length)
        setWordVisible(true)
      }, 250)
      return () => clearTimeout(t)
    }, 2500)
    return () => clearInterval(id)
  }, [])

  const countFor = (key: string) => {
    if (key === 'nails')  return proCounts.nails
    if (key === 'lashes') return proCounts.lashes
    if (key === 'makeup') return proCounts.makeup
    return 0
  }

  return (
    <main
      className="min-h-screen"
      style={{ background: '#FBFBF8', fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif' }}
    >

      {/* ── Nav bar ──────────────────────────────────────────────────────────── */}
      <header className="relative flex items-center justify-between px-4 pt-safe"
              style={{ height: 'calc(32px + env(safe-area-inset-top) + 16px)', paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        {/* Invisible placeholder to center logo */}
        <div className="w-11 h-11" />

        {/* VAVA logo — centered */}
        <VavaIcon className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 4 } as React.CSSProperties} />

        {/* Search icon */}
        <button
          className="flex items-center justify-center w-11 h-11 -mr-1"
          onClick={() => router.push('/search')}
          aria-label="搜尋"
        >
          <Search size={22} strokeWidth={1.8} className="text-foreground" />
        </button>
      </header>

      {/* ── Scrollable content ───────────────────────────────────────────────── */}
      <div className="px-4 pb-[83px] flex flex-col gap-6 mt-4">

        {/* ── Hero header ── */}
        <section className="flex flex-col items-center gap-1 text-center">
          <h1 style={{ fontSize: 28, fontWeight: 700, lineHeight: '34px', letterSpacing: '-0.3px', color: '#1F2723' }}>
            臨時需要預約？
          </h1>
          <p style={{ fontSize: 15, lineHeight: '20px', color: '#808868', marginTop: 4 }}>
            馬上找到有空又符合你需求的設計師
          </p>
        </section>

        {/* ── Request card ── */}
        <section
          className="relative overflow-hidden"
          style={{ borderRadius: 8, background: '#F0EDE5', minHeight: 401 }}
        >
          {/* Gradient blob — Figma asset, flipped vertically, bottom-right area */}
          <div
            className="absolute pointer-events-none"
            style={{ left: 80, top: 80, width: 293, height: 299, transform: 'scaleY(-1)' }}
          >
            <Image
              src="/images/home/gradient.png"
              alt=""
              fill
              className="object-cover"
              sizes="293px"
              aria-hidden="true"
            />
          </div>

          {/* Noise texture overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url('/images/home/noise.png')`,
              backgroundSize: '134px 134px',
              mixBlendMode: 'overlay',
              opacity: 0.5,
            }}
          />

          {/* Riso texture overlay */}
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            style={{ mixBlendMode: 'soft-light' }}
          >
            <div style={{ width: '100%', height: '100%', transform: 'rotate(90deg)', opacity: 0.8 }}>
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url('/images/home/riso-texture.png')`,
                  backgroundSize: '337px 449px',
                  opacity: 0.5,
                }}
              />
            </div>
          </div>

          {/* Card content */}
          <div className="relative flex flex-col justify-between h-full" style={{ padding: '24px 20px 16px 20px', gap: 12, minHeight: 401 }}>
            {/* Top copy */}
            <div className="flex flex-col gap-3">
              <p style={{ fontSize: 15, lineHeight: '24px', color: '#858279', fontWeight: 500 }}>
                不再一間一間問，讓設計師來找你！
              </p>
              <div style={{ fontSize: 28, fontWeight: 700, lineHeight: '1', color: '#1F2723' }}>
                <span>1分鐘填需求．不用等待</span>
                <br />
                <span>馬上預約</span>
                <span
                  style={{
                    color: '#FF5A3C',
                    transition: 'opacity 0.25s ease',
                    opacity: wordVisible ? 1 : 0,
                    display: 'inline-block',
                  }}
                >
                  {ROTATING_WORDS[wordIdx]}
                </span>
              </div>
            </div>

            {/* CTA button */}
            <button
              onClick={() => router.push('/book')}
              className="flex items-center gap-2 active:scale-[0.97] active:opacity-80 transition-all"
              style={{
                alignSelf: 'flex-start',
                height: 48,
                paddingLeft: 24,
                paddingRight: 24,
                borderRadius: 9999,
                background: '#1F2723',
                color: '#FBFBF8',
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              填寫需求
              <ChevronRight size={16} strokeWidth={2} style={{ opacity: 0.4 }} />
            </button>
          </div>
        </section>

        {/* ── Available Now ── */}
        <section className="flex flex-col gap-3" style={{ marginTop: 8 }}>
          {/* Section header */}
          <div className="flex items-center gap-2" style={{ height: 36, paddingTop: 10, paddingBottom: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 400, color: '#1F2723' }}>現在有空</span>
            <button
              className="flex items-center gap-0.5 active:opacity-70 transition-opacity"
              style={{ fontSize: 14, color: '#1F2723' }}
              aria-label="選擇地區"
            >
              台北・大安
              <ChevronDown size={14} strokeWidth={2} />
            </button>
          </div>

          {/* Category cards — horizontal scroll */}
          <div
            className="flex overflow-x-auto"
            style={{ gap: 10.5, scrollSnapType: 'x mandatory', paddingBottom: 2, marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16 }}
          >
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => router.push(cat.href)}
                className="flex flex-col flex-shrink-0 overflow-hidden active:opacity-75 transition-opacity"
                style={{ width: 116, borderRadius: 8, background: '#EAEAE4', scrollSnapAlign: 'start' }}
                aria-label={`搜尋${cat.label}`}
              >
                {/* Photo */}
                <div className="relative overflow-hidden" style={{ width: 116, height: 80 }}>
                  <Image
                    src={cat.image}
                    alt={cat.label}
                    fill
                    className="object-cover"
                    sizes="116px"
                  />
                </div>

                {/* Label row */}
                <div className="flex items-center gap-1 px-2" style={{ height: 32 }}>
                  {/* Green availability dot */}
                  <span
                    className="flex-shrink-0 rounded-full"
                    style={{ width: 6, height: 6, background: '#2E7D52' }}
                  />
                  <span
                    className="flex-1 truncate"
                    style={{ fontSize: 11, color: '#1F2723', lineHeight: '13px' }}
                  >
                    {countFor(cat.key)} 位{cat.label}
                  </span>
                  <ChevronRight size={12} strokeWidth={2} className="flex-shrink-0" style={{ color: '#808868' }} />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── Model opportunity banner ── */}
        <section>
          {/* Section header */}
          <div className="flex items-center gap-2 mb-3" style={{ paddingTop: 10, paddingBottom: 10 }}>
            <span style={{ fontSize: 16, color: '#1F2723' }}>模特機會</span>
            <span
              className="flex items-center"
              style={{
                height: 16,
                paddingLeft: 5,
                paddingRight: 5,
                borderRadius: 5,
                background: '#FEECFB',
                fontSize: 10,
                fontWeight: 600,
                color: '#BA4C8B',
                letterSpacing: '0.2px',
              }}
            >
              New
            </span>
          </div>

          {/* Card */}
          <div
            className="relative overflow-hidden"
            style={{ borderRadius: 8, background: '#BA4C8B', height: 166 }}
          >
            {/* Grain overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
                backgroundSize: '300px 300px',
                mixBlendMode: 'overlay',
                opacity: 0.15,
              }}
            />

            {/* Brushes photo (right side, absolute) */}
            <div
              className="absolute overflow-hidden"
              style={{ right: 0, top: 0, width: 125, height: 166 }}
            >
              <Image
                src="/images/home/model-brushes.png"
                alt=""
                fill
                className="object-cover object-left"
                sizes="125px"
                aria-hidden="true"
              />
            </div>

            {/* Text content (left side) */}
            <div
              className="absolute inset-0 flex flex-col justify-between"
              style={{ padding: '20px 0 16px 20px', maxWidth: '62%' }}
            >
              <div className="flex flex-col gap-1">
                <p style={{ fontSize: 13, lineHeight: '18px', color: 'rgba(255,255,255,0.85)' }}>
                  不介意當練習模特？
                </p>
                <p style={{ fontSize: 20, fontWeight: 700, lineHeight: '25px', color: '#FFFFFF' }}>
                  變美不用花大錢！
                </p>
                <p style={{ fontSize: 12, lineHeight: '16px', color: 'rgba(255,255,255,0.80)' }}>
                  享練習價甚至免費！
                </p>
              </div>

              <button
                onClick={() => router.push('/search?type=model')}
                className="flex items-center gap-1.5 active:scale-[0.97] active:opacity-80 transition-all"
                style={{
                  alignSelf: 'flex-start',
                  height: 40,
                  paddingLeft: 16,
                  paddingRight: 16,
                  borderRadius: 9999,
                  background: '#FBFBF8',
                  color: '#1F2723',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                尋找模特機會
                <ChevronRight size={16} strokeWidth={2} />
              </button>
            </div>
          </div>
        </section>

      </div>
    </main>
  )
}
