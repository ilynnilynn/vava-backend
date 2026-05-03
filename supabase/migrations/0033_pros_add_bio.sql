-- ============================================================
-- MIGRATION 0033 — Add bio column to pros
--
-- Free-text introduction shown on the pro's public profile.
-- ============================================================

ALTER TABLE pros
  ADD COLUMN IF NOT EXISTS bio TEXT;
