// lib/auth-routing.ts
// Pure function for auth gate routing. No side effects. Easy to test.

/**
 * @param hasSession   true if Supabase session exists
 * @param displayName  users.display_name (null = customer onboarding incomplete)
 * @param isApproved   pros.is_approved (null = no pro row, false = pending, true = approved)
 *
 * Pending pros (is_approved === false) go straight to pro mode — they can
 * use the app while waiting for admin approval. The submitted.tsx screen
 * only shows immediately after the onboarding flow completes, then
 * navigates away after 3 seconds.
 */
export function deriveRoute(
  hasSession: boolean,
  displayName: string | null,
  isApproved: boolean | null
): string {
  if (!hasSession) return '/(auth)/login'
  if (!displayName) return '/(onboarding)/customer/name'
  if (isApproved === true || isApproved === false) return '/(pro-tabs)/'
  return '/(tabs)/'
}
