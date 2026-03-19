-- ============================================================
-- MIGRATION 0007 — Align schema with TypeScript types
--
-- Adds columns to users and pros that exist in the types
-- (database.ts) but were missing from the original schema.
-- ============================================================

-- ── users: add missing columns ─────────────────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS profile_photo_url  TEXT;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_provider      TEXT NOT NULL DEFAULT 'line';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS line_notifications BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS birth_year         INTEGER;

-- ── pros: add missing columns ──────────────────────────────

ALTER TABLE pros
  ADD COLUMN IF NOT EXISTS profile_photo_url       TEXT;

ALTER TABLE pros
  ADD COLUMN IF NOT EXISTS confirmed_booking_count INTEGER NOT NULL DEFAULT 0;
