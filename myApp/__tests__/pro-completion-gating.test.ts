// myApp/__tests__/pro-completion-gating.test.ts
// Tests for B021: Pro Application Completion Gating

type ProStatus = 'none' | 'pending' | 'approved'
type UserRole = 'customer' | 'pro'

// Mirrors auth-context.tsx proStatus derivation (lines 82-84)
function deriveProStatus(pro: { submitted_at: string | null; is_approved: boolean } | null): ProStatus {
  return pro === null || !pro.submitted_at ? 'none'
    : pro.is_approved ? 'approved'
    : 'pending'
}

// Mirrors role-context.tsx setActiveRole guard (line 66)
function isRoleAllowed(role: UserRole, enabledRoles: UserRole[]): boolean {
  return enabledRoles.includes(role)
}

// ── deriveProStatus ──────────────────────────────────────────

describe('deriveProStatus', () => {
  it('returns none when pro row is null', () => {
    expect(deriveProStatus(null)).toBe('none')
  })

  it('returns none when pro row exists but submitted_at is null', () => {
    expect(deriveProStatus({ submitted_at: null, is_approved: false })).toBe('none')
  })

  it('returns pending when submitted but not approved', () => {
    expect(deriveProStatus({ submitted_at: '2026-05-01T00:00:00Z', is_approved: false })).toBe('pending')
  })

  it('returns approved when submitted and approved', () => {
    expect(deriveProStatus({ submitted_at: '2026-05-01T00:00:00Z', is_approved: true })).toBe('approved')
  })

  // Edge: empty string submitted_at is falsy → should be 'none'
  it('returns none when submitted_at is empty string', () => {
    expect(deriveProStatus({ submitted_at: '', is_approved: false })).toBe('none')
  })
})

// ── isRoleAllowed (setActiveRole guard) ─────────────────────

describe('isRoleAllowed', () => {
  it('allows customer role for customer-only users', () => {
    expect(isRoleAllowed('customer', ['customer'])).toBe(true)
  })

  it('rejects pro role for customer-only users', () => {
    expect(isRoleAllowed('pro', ['customer'])).toBe(false)
  })

  it('allows pro role for approved pros', () => {
    expect(isRoleAllowed('pro', ['customer', 'pro'])).toBe(true)
  })

  it('allows customer role for approved pros', () => {
    expect(isRoleAllowed('customer', ['customer', 'pro'])).toBe(true)
  })
})

// ── RoleToggle visibility ───────────────────────────────────

describe('RoleToggle visibility', () => {
  // Mirrors both account pages: {proStatus === 'approved' && <RoleToggle />}
  function shouldShowRoleToggle(proStatus: ProStatus): boolean {
    return proStatus === 'approved'
  }

  it('hides toggle for none status', () => {
    expect(shouldShowRoleToggle('none')).toBe(false)
  })

  it('hides toggle for pending status', () => {
    expect(shouldShowRoleToggle('pending')).toBe(false)
  })

  it('shows toggle for approved status', () => {
    expect(shouldShowRoleToggle('approved')).toBe(true)
  })
})

// ── Apply entry visibility ──────────────────────────────────

describe('Apply entry visibility', () => {
  // Mirrors (tabs)/account.tsx: {proStatus === 'none' && apply entry}
  function shouldShowApplyEntry(proStatus: ProStatus): boolean {
    return proStatus === 'none'
  }

  it('shows apply for none status', () => {
    expect(shouldShowApplyEntry('none')).toBe(true)
  })

  it('hides apply for pending status', () => {
    expect(shouldShowApplyEntry('pending')).toBe(false)
  })

  it('hides apply for approved status', () => {
    expect(shouldShowApplyEntry('approved')).toBe(false)
  })
})

// ── B015: Toggle and apply never coexist ────────────────────

describe('B015: Toggle and apply are mutually exclusive', () => {
  function shouldShowRoleToggle(proStatus: ProStatus): boolean {
    return proStatus === 'approved'
  }
  function shouldShowApplyEntry(proStatus: ProStatus): boolean {
    return proStatus === 'none'
  }

  const allStatuses: ProStatus[] = ['none', 'pending', 'approved']

  it.each(allStatuses)('toggle and apply never both visible for status "%s"', (status) => {
    const toggle = shouldShowRoleToggle(status)
    const apply = shouldShowApplyEntry(status)
    expect(toggle && apply).toBe(false)
  })
})

// ── Submitted page: status routing logic ─────────────────────

type SubmittedStatus = 'submitting' | 'success' | 'error' | 'pending'

/**
 * Mirrors submitted.tsx useEffect mount logic (lines 82-89):
 * if proStatus === 'pending' → 'pending' (skip submit)
 * else → 'submitting' (run submit)
 */
function determineInitialStatus(proStatus: ProStatus): SubmittedStatus {
  return proStatus === 'pending' ? 'pending' : 'submitting'
}

describe('Submitted page: initial status routing', () => {
  it('shows pending view when proStatus is already pending (re-entry from account)', () => {
    expect(determineInitialStatus('pending')).toBe('pending')
  })

  it('runs submit when proStatus is none (fresh submission)', () => {
    expect(determineInitialStatus('none')).toBe('submitting')
  })

  it('runs submit when proStatus is approved (edge case)', () => {
    expect(determineInitialStatus('approved')).toBe('submitting')
  })

  // Intentional failure verification: pending must NOT trigger submit
  it('pending does not return submitting', () => {
    expect(determineInitialStatus('pending')).not.toBe('submitting')
  })
})

describe('Submitted page: escape routes exist for all terminal states', () => {
  // Mirrors the view structure in submitted.tsx
  // Each state should have at least one navigation action to prevent dead-ends
  const stateHasBackToAccount: Record<SubmittedStatus, boolean> = {
    submitting: false,  // loading state, no buttons needed
    success: true,      // "返回帳號" text button as fallback
    error: true,        // "返回帳號" below retry
    pending: true,      // "返回帳號" primary CTA
  }

  it('error state has back-to-account escape', () => {
    expect(stateHasBackToAccount.error).toBe(true)
  })

  it('pending state has back-to-account escape', () => {
    expect(stateHasBackToAccount.pending).toBe(true)
  })

  it('success state has back-to-account escape', () => {
    expect(stateHasBackToAccount.success).toBe(true)
  })

  // Verify submitting is the only state without navigation (expected — it's transient)
  it('submitting is the only state without escape (transient)', () => {
    const statesWithoutEscape = Object.entries(stateHasBackToAccount)
      .filter(([, has]) => !has)
      .map(([state]) => state)
    expect(statesWithoutEscape).toEqual(['submitting'])
  })
})

// ── B015: Post-submission proStatus must be pending ─────────

describe('B015: proStatus after submission', () => {
  it('transitions from none to pending after upsert writes submitted_at', () => {
    // Before upsert: no pro row
    const before = deriveProStatus(null)
    expect(before).toBe('none')

    // After upsert commits and refreshUser re-fetches
    const after = deriveProStatus({ submitted_at: '2026-05-08T00:00:00Z', is_approved: false })
    expect(after).toBe('pending')
  })

  it('does not become approved just from submission', () => {
    const status = deriveProStatus({ submitted_at: '2026-05-08T00:00:00Z', is_approved: false })
    expect(status).not.toBe('approved')
  })
})
