-- ============================================================
-- MIGRATION 0024 — Rename users.name → users.display_name
--
-- The remote DB was seeded from an older LINE-based schema
-- that used 'name'. All new app code expects 'display_name'.
-- ============================================================

ALTER TABLE users RENAME COLUMN name TO display_name;
