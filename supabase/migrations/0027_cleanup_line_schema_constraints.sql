-- ============================================================
-- MIGRATION 0027 — Remove LINE app NOT NULL constraints
--
-- The remote DB was seeded from the old LINE app. Several
-- columns are NOT NULL or lack defaults that break inserts
-- for Google/Apple OAuth users who have none of these values.
-- ============================================================

-- auth_provider: LINE users had 'line', OAuth users have null
ALTER TABLE users ALTER COLUMN auth_provider DROP NOT NULL;

-- line_notifications: LINE-specific, add default so new rows don't fail
ALTER TABLE users ALTER COLUMN line_notifications SET DEFAULT false;
ALTER TABLE users ALTER COLUMN line_notifications DROP NOT NULL;

-- is_admin: should have a default of false
ALTER TABLE users ALTER COLUMN is_admin SET DEFAULT false;

-- birth_year: old int column, no longer used (replaced by birthday date column)
ALTER TABLE users ALTER COLUMN birth_year DROP NOT NULL;
