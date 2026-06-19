// lib/derive-pro-status.ts
import type { Pro } from '@/types/database'

export type ProStatus = 'none' | 'pending' | 'approved' | 'rejected'

/** Derive proStatus from the pros table row. Pure function — no side effects. */
export function deriveProStatus(pro: Pro | null): ProStatus {
  if (pro === null || !pro.submitted_at) return 'none'
  if (pro.is_approved) return 'approved'
  if (pro.verification_status === 'declined') return 'rejected'
  return 'pending'
}
