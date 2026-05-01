-- ============================================================
-- MIGRATION 0032 — Make pros.line_user_id nullable
--
-- line_user_id was originally NOT NULL because all pros signed up
-- via LINE. New onboarding uses Apple/Google auth, so pros no longer
-- have a LINE user ID. Drop the NOT NULL constraint.
-- ============================================================

ALTER TABLE pros
  ALTER COLUMN line_user_id DROP NOT NULL;
