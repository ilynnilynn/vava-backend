-- Add verification tracking columns to pros table
ALTER TABLE pros
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS rejection_reasons   JSONB,
  ADD COLUMN IF NOT EXISTS rejection_note      TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at         TIMESTAMPTZ;
