// lib/useProfile.ts
//
// Single source of truth for human identity.
//
// Architecture:
//   auth.users  — system identity (id, email, provider)
//   users table — human identity (display_name, phone, birthday, gender)
//                 fetched by users.id = auth.user.id
//
// Always use `profile.display_name` for name display.
// Never use auth metadata or email as a display name.

import { useSession } from './auth-context'

const PRIVATE_RELAY_SUFFIX = 'privaterelay.appleid.com'

export function useProfile() {
  const { user: profile, session, refreshUser } = useSession()

  const authUser = session?.user ?? null

  /** Human-facing display name — always from the users table. */
  const displayName: string = profile?.display_name ?? '未設定名稱'

  /**
   * Email to show in UI. Returns null for Apple private-relay addresses
   * so the caller can show "使用 Apple 登入（已隱藏 Email）" instead.
   */
  const visibleEmail: string | null =
    authUser?.email && !authUser.email.endsWith(PRIVATE_RELAY_SUFFIX)
      ? authUser.email
      : null

  /** True when the user signed in with Apple Hide My Email. */
  const isApplePrivateRelay: boolean =
    !!authUser?.email?.endsWith(PRIVATE_RELAY_SUFFIX)

  /** Supabase auth user id — use this as FK when writing rows. */
  const userId: string | null = authUser?.id ?? null

  return {
    profile,           // full users-table row (or null while loading)
    displayName,
    visibleEmail,
    isApplePrivateRelay,
    userId,
    refreshProfile: refreshUser,
  }
}
