-- ============================================================
-- MIGRATION 0022 — Expo push token on users
-- Stored when the app registers for push notifications.
-- Used by server-side notification dispatch.
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS push_token_expo text;
