// lib/auth-routing.ts
// Pure function for auth gate routing. No side effects. Easy to test.

/**
 * @param hasSession   true if Supabase session exists
 * @param displayName  users.display_name (null = customer onboarding incomplete)
 * @param isApproved   pros.is_approved (null = no pro row, false = pending, true = approved)
 *
 * Only approved pros go to pro tabs. Pending pros and customers both land
 * in customer tabs — pending pros see their status on the account screen
 * and can switch to pro mode once approved via the RoleToggle.
 */
export function deriveRoute(
  hasSession: boolean,
  displayName: string | null,
  isApproved: boolean | null
): string {
  if (!hasSession) return '/(auth)/login'
  if (!displayName) return '/(onboarding)/customer/name'
  if (isApproved === true) return '/(pro-tabs)/'
  return '/(tabs)/'
}
