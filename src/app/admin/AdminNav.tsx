'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/verification', label: 'Verification' },
  { href: '/admin/pros', label: 'Pros' },
  { href: '/admin/bookings', label: 'Bookings' },
  { href: '/admin/flags', label: 'Flags' },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1 text-sm">
      {NAV_LINKS.map(({ href, label }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              active
                ? 'bg-foreground/8 text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
