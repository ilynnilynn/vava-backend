-- Add verification tracking columns to pros table
ALTER TABLE pros
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS rejection_reasons   JSONB,
  ADD COLUMN IF NOT EXISTS rejection_note      TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at         TIMESTAMPTZ;

-- Backfill: existing approved pros should not appear as pending
UPDATE pros
SET verification_status = 'approved',
    reviewed_at = COALESCE(reviewed_at, now())
WHERE is_approved = true
  AND verification_status = 'pending';
