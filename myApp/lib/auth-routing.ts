// lib/auth-routing.ts
// Pure functions for auth gate routing. No side effects. Easy to test.

type OnboardingUser = {
  display_name: string | null
  phone: string | null
  birthday: string | null
  gender: string | null
} | null

/**
 * Returns the onboarding start route if any required field is missing,
 * or null if all done. Always routes to the name page so users restart
 * from the beginning rather than deep-linking into a mid-flow screen.
 */
export function deriveOnboardingRoute(user: OnboardingUser): string | null {
  if (!user?.display_name || !user?.phone || !user?.birthday || !user?.gender) {
    return '/(onboarding)/customer/name'
  }
  return null
}

/**
 * @param hasSession        true if Supabase session exists
 * @param user              users row with onboarding fields (null = no row yet)
 * @param isApproved        pros.is_approved (null = no pro row, false = pending, true = approved)
 * @param hasSeenWelcome    true if the welcome value carousel has been shown before
 *
 * Only approved pros go to pro tabs. Pending pros and customers both land
 * in customer tabs — pending pros see their status on the account screen
 * and can switch to pro mode once approved via the RoleToggle.
 *
 * First-time users who haven't seen the welcome carousel get routed there
 * before reaching the login screen.
 */
export function deriveRoute(
  hasSession: boolean,
  user: OnboardingUser,
  isApproved: boolean | null,
  hasSeenWelcome: boolean = true
): string {
  if (!hasSession) {
    if (!hasSeenWelcome) return '/(onboarding)/welcome/'
    return '/(auth)/login'
  }
  const onboarding = deriveOnboardingRoute(user)
  if (onboarding) return onboarding
  if (isApproved === true) return '/(pro-tabs)/'
  return '/(tabs)/'
}
