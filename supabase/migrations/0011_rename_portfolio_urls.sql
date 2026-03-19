-- ============================================================
-- MIGRATION 0011 — Rename portfolio_urls → portfolio_photos
--
-- Aligns DB column name with TypeScript types and application code.
-- ============================================================

ALTER TABLE pros
  RENAME COLUMN portfolio_urls TO portfolio_photos;
