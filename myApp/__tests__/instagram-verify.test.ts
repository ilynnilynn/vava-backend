// __tests__/instagram-verify.test.ts
// Unit tests for the client-side Instagram verification logic.
// After the B013 proxy migration, the client calls /api/instagram/verify
// and receives { state: VerifyState } — Instagram-specific JSON parsing
// is now handled server-side.
//
// Coverage:
//   - Format validation (no network call)
//   - Proxy HTTP status mapping (non-2xx → network_error)
//   - Proxy state passthrough (all VerifyState values)
//   - Network / fetch failures
//   - AbortSignal forwarding and propagation
//   - Idempotency and boundary lengths

import { describe, it, expect, vi } from 'vitest'
import { checkInstagramHandle, IG_HANDLE_RE } from '../lib/instagram-verify'

// ── Mock helpers ───────────────────────────────────────────────────────────────

type MockResponse = {
  status: number
  ok: boolean
  json: () => Promise<unknown>
}

function mockFetch(status: number, body?: unknown): typeof fetch {
  const response: MockResponse = {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body ?? {}),
  }
  return vi.fn().mockResolvedValue(response)
}

function mockFetchThrows(message = 'Network request failed'): typeof fetch {
  return vi.fn().mockRejectedValue(new Error(message))
}

function mockFetchBadJson(status = 200): typeof fetch {
  const response: MockResponse = {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.reject(new Error('invalid json')),
  }
  return vi.fn().mockResolvedValue(response)
}

// ── IG_HANDLE_RE ──────────────────────────────────────────────────────────────

describe('IG_HANDLE_RE', () => {
  const valid = ['a', 'alice', 'alice123', '_alice', 'alice_', 'a.lai', 'a'.repeat(30)]
  const invalid = ['', '@alice', 'alice smith', 'a'.repeat(31), 'alice!', 'alice#']

  it.each(valid)('accepts "%s"', (h) => {
    expect(IG_HANDLE_RE.test(h)).toBe(true)
  })

  it.each(invalid)('rejects "%s"', (h) => {
    expect(IG_HANDLE_RE.test(h)).toBe(false)
  })
})

// ── Format validation (no network call) ──────────────────────────────────────

describe('checkInstagramHandle — format validation', () => {
  it('returns invalid_format for empty string', async () => {
    const f = mockFetch(200)
    expect(await checkInstagramHandle('', f)).toBe('invalid_format')
    expect(f).not.toHaveBeenCalled()
  })

  it('returns invalid_format for handle with @ prefix', async () => {
    const f = mockFetch(200)
    expect(await checkInstagramHandle('@alice', f)).toBe('invalid_format')
    expect(f).not.toHaveBeenCalled()
  })

  it('returns invalid_format for handle with spaces', async () => {
    const f = mockFetch(200)
    expect(await checkInstagramHandle('alice smith', f)).toBe('invalid_format')
    expect(f).not.toHaveBeenCalled()
  })

  it('returns invalid_format for handle longer than 30 chars', async () => {
    const f = mockFetch(200)
    expect(await checkInstagramHandle('a'.repeat(31), f)).toBe('invalid_format')
    expect(f).not.toHaveBeenCalled()
  })

  it('returns invalid_format for handle with special chars', async () => {
    const f = mockFetch(200)
    expect(await checkInstagramHandle('alice!nails', f)).toBe('invalid_format')
    expect(f).not.toHaveBeenCalled()
  })

  it('calls fetch for a valid-format handle', async () => {
    const f = mockFetch(200, { state: 'verified' })
    await checkInstagramHandle('alice', f)
    expect(f).toHaveBeenCalledTimes(1)
  })
})

// ── Proxy HTTP status mapping ──────────────────────────────────────────────────
// The proxy always returns 200+{state} for known outcomes.
// Any non-2xx from the proxy (misconfiguration, outage) → network_error.

describe('checkInstagramHandle — proxy HTTP status mapping', () => {
  it('404 from proxy → network_error', async () => {
    expect(await checkInstagramHandle('ghost_user_xyz', mockFetch(404))).toBe('network_error')
  })

  it('429 from proxy → network_error', async () => {
    expect(await checkInstagramHandle('someuser', mockFetch(429))).toBe('network_error')
  })

  it('401 from proxy → network_error', async () => {
    expect(await checkInstagramHandle('someuser', mockFetch(401))).toBe('network_error')
  })

  it('403 from proxy → network_error', async () => {
    expect(await checkInstagramHandle('someuser', mockFetch(403))).toBe('network_error')
  })

  it('500 from proxy → network_error', async () => {
    expect(await checkInstagramHandle('someuser', mockFetch(500))).toBe('network_error')
  })

  it('503 from proxy → network_error', async () => {
    expect(await checkInstagramHandle('someuser', mockFetch(503))).toBe('network_error')
  })
})

// ── Proxy state passthrough ────────────────────────────────────────────────────

describe('checkInstagramHandle — proxy state passthrough', () => {
  it('{ state: "verified" } → verified', async () => {
    const f = mockFetch(200, { state: 'verified' })
    expect(await checkInstagramHandle('public_user', f)).toBe('verified')
  })

  it('{ state: "private" } → private', async () => {
    const f = mockFetch(200, { state: 'private' })
    expect(await checkInstagramHandle('private_user', f)).toBe('private')
  })

  it('{ state: "not_found" } → not_found', async () => {
    const f = mockFetch(200, { state: 'not_found' })
    expect(await checkInstagramHandle('ghost', f)).toBe('not_found')
  })

  it('{ state: "rate_limit" } → rate_limit', async () => {
    const f = mockFetch(200, { state: 'rate_limit' })
    expect(await checkInstagramHandle('someuser', f)).toBe('rate_limit')
  })

  it('{ state: "network_error" } → network_error (proxy forwarded its own error)', async () => {
    const f = mockFetch(200, { state: 'network_error' })
    expect(await checkInstagramHandle('someuser', f)).toBe('network_error')
  })

  // B004: private/restricted accounts — now handled server-side, proxy returns "private"
  it('B004: proxy returns "private" for restricted accounts', async () => {
    const f = mockFetch(200, { state: 'private' })
    expect(await checkInstagramHandle('a.lai', f)).toBe('private')
  })

  it('unknown state string from proxy → network_error', async () => {
    const f = mockFetch(200, { state: 'unknown_garbage' })
    expect(await checkInstagramHandle('someuser', f)).toBe('network_error')
  })

  it('missing state field from proxy → network_error', async () => {
    const f = mockFetch(200, {})
    expect(await checkInstagramHandle('someuser', f)).toBe('network_error')
  })

  it('200 + JSON parse failure → network_error', async () => {
    expect(await checkInstagramHandle('someuser', mockFetchBadJson(200))).toBe('network_error')
  })
})

// ── Network / fetch failures ──────────────────────────────────────────────────

describe('checkInstagramHandle — network failures', () => {
  it('fetch throws → network_error', async () => {
    expect(await checkInstagramHandle('validuser', mockFetchThrows())).toBe('network_error')
  })

  it('fetch throws with DNS message → network_error', async () => {
    expect(
      await checkInstagramHandle('validuser', mockFetchThrows('DNS lookup failed')),
    ).toBe('network_error')
  })

  it('fetch throws with plain Error (not AbortError) → network_error', async () => {
    expect(
      await checkInstagramHandle('validuser', mockFetchThrows('The operation timed out')),
    ).toBe('network_error')
  })
})

// ── Idempotency / no stale state ──────────────────────────────────────────────

describe('checkInstagramHandle — idempotency', () => {
  it('same handle returns consistent result across calls', async () => {
    const r1 = await checkInstagramHandle('alice', mockFetch(200, { state: 'verified' }))
    const r2 = await checkInstagramHandle('alice', mockFetch(200, { state: 'verified' }))
    expect(r1).toBe('verified')
    expect(r2).toBe('verified')
  })

  it('different handles return independent results', async () => {
    expect(await checkInstagramHandle('public_user', mockFetch(200, { state: 'verified' }))).toBe('verified')
    expect(await checkInstagramHandle('private_user', mockFetch(200, { state: 'private' }))).toBe('private')
    expect(await checkInstagramHandle('ghost', mockFetch(200, { state: 'not_found' }))).toBe('not_found')
  })
})

// ── AbortSignal / cancellation ────────────────────────────────────────────────

describe('checkInstagramHandle — AbortSignal', () => {
  it('forwards signal to fetchImpl', async () => {
    const controller = new AbortController()
    const f = mockFetch(200, { state: 'verified' })
    await checkInstagramHandle('alice', f, controller.signal)
    expect(f).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: controller.signal }),
    )
  })

  it('propagates AbortError so caller can detect cancellation', async () => {
    const abortError = Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
    const f = vi.fn().mockRejectedValue(abortError)
    await expect(checkInstagramHandle('alice', f)).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('does NOT swallow AbortError as network_error', async () => {
    const abortError = Object.assign(new Error('AbortError'), { name: 'AbortError' })
    const f = vi.fn().mockRejectedValue(abortError)
    await expect(checkInstagramHandle('alice', f)).rejects.toBeDefined()
  })

  it('plain Error (name=Error, not AbortError) → network_error', async () => {
    const networkErr = new Error('Network request failed')
    const f = vi.fn().mockRejectedValue(networkErr)
    expect(await checkInstagramHandle('alice', f)).toBe('network_error')
  })
})

// ── Edge: boundary handle lengths ─────────────────────────────────────────────

describe('checkInstagramHandle — boundary lengths', () => {
  it('1-char handle is valid format and reaches fetch', async () => {
    const f = mockFetch(200, { state: 'verified' })
    expect(await checkInstagramHandle('a', f)).toBe('verified')
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('30-char handle is valid format', async () => {
    const f = mockFetch(200, { state: 'verified' })
    expect(await checkInstagramHandle('a'.repeat(30), f)).toBe('verified')
  })

  it('31-char handle → invalid_format (no network)', async () => {
    const f = mockFetch(200)
    expect(await checkInstagramHandle('a'.repeat(31), f)).toBe('invalid_format')
    expect(f).not.toHaveBeenCalled()
  })
})
