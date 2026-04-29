-- ============================================================
-- MIGRATION 0023 — Onboarding columns
--
-- users: birthday (date), gender (text)
-- pros:  domains (text array)
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS birthday date;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS gender text
    CHECK (gender IN ('female', 'male', 'other', 'prefer_not'));

ALTER TABLE pros
  ADD COLUMN IF NOT EXISTS domains text[] NOT NULL DEFAULT '{}';
