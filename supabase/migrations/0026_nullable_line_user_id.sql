-- ============================================================
-- MIGRATION 0026 — Make users.line_user_id nullable
--
-- The remote DB was seeded from the old LINE-based app where
-- line_user_id was NOT NULL. New users authenticate via
-- Google/Apple and have no line_user_id.
-- ============================================================

ALTER TABLE users ALTER COLUMN line_user_id DROP NOT NULL;
