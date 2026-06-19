-- Add line_id and ig_verification_status to pros table.
-- line_id: LINE contact ID shared with customers after booking.
-- ig_verification_status: result of Instagram handle verification during onboarding.

ALTER TABLE pros
  ADD COLUMN IF NOT EXISTS line_id TEXT,
  ADD COLUMN IF NOT EXISTS ig_verification_status TEXT DEFAULT 'pending_review'
    CHECK (ig_verification_status IN ('verified', 'pending_review'));
