'use client'

// ============================================================
// CustomerBottomNav
//
// Matches Figma "Final → Home" bottom nav (421:853):
//   • 3 tabs: Home · Bookings · Account
//   • Tab bar height: 49pt + safe-area-inset-bottom
//   • Active: Forest #1F2723  |  Inactive: #9A9B94
//   • Icon 24pt + label 12pt below
// ============================================================

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CalendarDays, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/home',     icon: Home,         label: 'Home'     },
  { href: '/bookings', icon: CalendarDays,  label: 'Bookings' },
  { href: '/profile',  icon: User,          label: 'Account'  },
] as const

export function CustomerBottomNav() {
  const pathname = usePathname()

  const hide =
    pathname === '/book' ||
    pathname.startsWith('/book/') ||
    pathname.startsWith('/onboarding')

  if (hide) return null

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t"
      style={{
        background: '#FBFBF8',
        borderColor: '#D8D9D2',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-stretch justify-around" style={{ height: 49 }}>
        {TABS.map(({ href, icon: Icon, label }) => {
          const isActive =
            href === '/home'
              ? pathname === '/home'
              : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-[4px]',
                'transition-opacity active:opacity-60',
                isActive ? 'text-[#1F2723]' : 'text-[#9A9B94]',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={24} strokeWidth={isActive ? 2 : 1.5} aria-hidden="true" />
              <span
                className="leading-none"
                style={{ fontSize: 12, fontWeight: isActive ? 600 : 400 }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
