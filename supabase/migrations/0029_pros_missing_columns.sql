-- ============================================================
-- MIGRATION 0029 — Add missing columns to pros
--
-- The pros table in the live DB pre-dates migration tracking,
-- so user_id and studio_district were never added.
--
-- user_id:         UUID FK to auth.users — used by the onboarding
--                  upsert (onConflict: 'user_id')
-- studio_district: "City District" combined string saved from the
--                  onboarding location step
-- ============================================================

-- Add user_id (nullable because existing rows have none)
ALTER TABLE pros
  ADD COLUMN IF NOT EXISTS user_id UUID
    REFERENCES auth.users(id) ON DELETE CASCADE;

-- Unique index (partial: ignores NULLs so existing rows don't conflict)
CREATE UNIQUE INDEX IF NOT EXISTS pros_user_id_unique
  ON pros (user_id)
  WHERE user_id IS NOT NULL;

-- Add studio_district
ALTER TABLE pros
  ADD COLUMN IF NOT EXISTS studio_district TEXT;
