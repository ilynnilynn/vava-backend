import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Parse a timestamp string as UTC.
 *  Supabase returns timestamptz without suffix ("2026-03-22T09:30:00").
 *  JS Date() treats that as local time — append Z to force UTC. */
export function parseUTC(raw: string): number {
  const s = raw.includes('Z') || raw.includes('+') ? raw : raw + 'Z'
  return new Date(s).getTime()
}
