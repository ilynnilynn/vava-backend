// lib/instagram-verify.ts
// Pure verification logic — no React, fully testable.
// Calls the server-side proxy (/api/instagram/verify) instead of Instagram
// directly, to avoid CORS and client-IP blocks in mobile environments.

// Instagram username rules: 1–30 chars, letters/digits/underscores/periods.
// No spaces, no @. Component must strip those before calling here.
export const IG_HANDLE_RE = /^[a-zA-Z0-9._]{1,30}$/

export type VerifyState =
  | 'verified'
  | 'not_found'
  | 'private'
  | 'invalid_format'
  | 'rate_limit'
  | 'network_error'

const VALID_STATES: VerifyState[] = [
  'verified', 'not_found', 'private', 'invalid_format', 'rate_limit', 'network_error',
]

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'
const PROXY_URL = `${API_BASE}/api/instagram/verify`

/**
 * Check an Instagram handle via the server-side proxy.
 * @param handle  Already-cleaned handle: no spaces, no leading @, max 30 chars.
 * @param fetchImpl  Injected fetch implementation (defaults to global fetch).
 * @param signal  Optional AbortSignal — if aborted, the function throws AbortError
 *                so the caller can detect cancellation and skip state updates.
 * @returns VerifyState — throws only on AbortError.
 */
export async function checkInstagramHandle(
  handle: string,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<VerifyState> {
  if (!IG_HANDLE_RE.test(handle)) return 'invalid_format'

  let res: Response
  try {
    res = await fetchImpl(
      `${PROXY_URL}?username=${encodeURIComponent(handle)}`,
      { signal },
    )
  } catch (err) {
    // AbortError means the caller cancelled — propagate so caller discards the result.
    if ((err as Error)?.name === 'AbortError') throw err
    return 'network_error'
  }

  if (!res.ok) return 'network_error'

  try {
    const json = await res.json()
    const state = json?.state as string | undefined
    if (state && (VALID_STATES as string[]).includes(state)) {
      return state as VerifyState
    }
    return 'network_error'
  } catch {
    return 'network_error'
  }
}
