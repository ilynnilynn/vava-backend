// ============================================================
// Verification constants — shared between client and API
// ============================================================

export const DECLINE_REASONS = [
  'ID photo is unclear',
  'ID does not match submitted name',
  'Missing required information',
  'Invalid phone number',
  'Missing or invalid portfolio',
  'Business information incomplete',
  'Other',
] as const

export type DeclineReason = (typeof DECLINE_REASONS)[number]

/** Validate that every reason is in the allowed list */
export function validateDeclineReasons(reasons: unknown): reasons is DeclineReason[] {
  if (!Array.isArray(reasons) || reasons.length === 0) return false
  return reasons.every(r => typeof r === 'string' && (DECLINE_REASONS as readonly string[]).includes(r))
}
