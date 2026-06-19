// myApp/__tests__/derive-pro-status.test.ts
import { deriveProStatus } from '../lib/derive-pro-status'
import type { Pro } from '../types/database'

/** Minimal Pro row factory — only the fields deriveProStatus reads */
function makePro(overrides: Partial<Pro> = {}): Pro {
  return {
    id: 'pro-1',
    line_user_id: 'U123',
    display_name: 'Test Pro',
    phone: '0912345678',
    ig_handle: 'testpro',
    ig_verification_status: 'verified',
    line_id: null,
    domains: ['nails'],
    studio_name: null,
    studio_address: '台北市大安區',
    studio_district: '台北市大安區',
    studio_lat: null,
    studio_lng: null,
    nail_scope: null,
    gender: 'female',
    profile_photo_url: null,
    portfolio_photos: [],
    id_photo_path: null,
    is_approved: false,
    is_suspended: false,
    is_accepting: false,
    submitted_at: null,
    verification_status: 'draft',
    rejection_reasons: null,
    rejection_note: null,
    reviewed_at: null,
    application_count: 1,
    subscription_status: 'free',
    confirmed_booking_count: 0,
    standing: 'good',
    no_show_window_minutes: 15,
    work_start_hour: 10,
    work_end_hour: 20,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('deriveProStatus', () => {
  it('returns "none" when pro is null', () => {
    expect(deriveProStatus(null)).toBe('none')
  })

  it('returns "none" when submitted_at is null (draft / not submitted)', () => {
    const pro = makePro({ submitted_at: null, verification_status: 'draft' })
    expect(deriveProStatus(pro)).toBe('none')
  })

  it('returns "pending" when submitted and verification_status is pending', () => {
    const pro = makePro({
      submitted_at: '2026-04-01T00:00:00Z',
      verification_status: 'pending',
      is_approved: false,
    })
    expect(deriveProStatus(pro)).toBe('pending')
  })

  it('returns "approved" when is_approved is true', () => {
    const pro = makePro({
      submitted_at: '2026-04-01T00:00:00Z',
      verification_status: 'approved',
      is_approved: true,
    })
    expect(deriveProStatus(pro)).toBe('approved')
  })

  it('returns "rejected" when verification_status is declined', () => {
    const pro = makePro({
      submitted_at: '2026-04-01T00:00:00Z',
      verification_status: 'declined',
      is_approved: false,
      rejection_reasons: ['ID photo is unclear'],
      rejection_note: 'Please resubmit',
      reviewed_at: '2026-04-02T00:00:00Z',
    })
    expect(deriveProStatus(pro)).toBe('rejected')
  })

  // ── Critical: rejected must NOT return 'pending' (the original bug) ──
  it('does NOT return "pending" for a declined application', () => {
    const pro = makePro({
      submitted_at: '2026-04-01T00:00:00Z',
      verification_status: 'declined',
      is_approved: false,
    })
    expect(deriveProStatus(pro)).not.toBe('pending')
  })

  // ── Reapply scenario: after re-submission, status returns to pending ──
  // Rejection data is preserved on reapply (not cleared) so admin can see history
  it('returns "pending" after a rejected user reapplies (rejection data preserved)', () => {
    const pro = makePro({
      submitted_at: '2026-04-10T00:00:00Z', // fresh timestamp
      verification_status: 'pending',
      is_approved: false,
      rejection_reasons: ['ID photo is unclear'], // preserved from previous decline
      rejection_note: 'Please resubmit',          // preserved from previous decline
      reviewed_at: '2026-04-05T00:00:00Z',        // preserved from previous review
    })
    expect(deriveProStatus(pro)).toBe('pending')
  })
})
