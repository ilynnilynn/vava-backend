// lib/auth-routing.ts
// Pure function for auth gate routing. No side effects. Easy to test.

/**
 * @param hasSession   true if Supabase session exists
 * @param displayName  users.display_name (null = customer onboarding incomplete)
 * @param isApproved   pros.is_approved (null = no pro row, false = pending, true = approved)
 */
export function deriveRoute(
  hasSession: boolean,
  displayName: string | null,
  isApproved: boolean | null
): string {
  if (!hasSession) return '/(auth)/login'
  if (!displayName) return '/(onboarding)/customer/name'
  if (isApproved === true) return '/(pro-tabs)/'
  if (isApproved === false) return '/(onboarding)/pro/submitted'
  return '/(tabs)/'
}
