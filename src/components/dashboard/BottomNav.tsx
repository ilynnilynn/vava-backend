'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  CalendarClock,
  ClipboardList,
  Scissors,
  Settings,
  CreditCard,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/pro/dashboard', label: '首頁', icon: Home },
  { href: '/pro/dashboard/slots', label: '時段', icon: CalendarClock },
  { href: '/pro/dashboard/history', label: '紀錄', icon: ClipboardList },
  { href: '/pro/dashboard/services', label: '服務', icon: Scissors },
  { href: '/pro/dashboard/settings', label: '設定', icon: Settings },
  { href: '/pro/dashboard/subscription', label: '訂閱', icon: CreditCard },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/pro/dashboard'
              ? pathname === '/pro/dashboard'
              : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors',
                isActive
                  ? 'text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
