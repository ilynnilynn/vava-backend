-- ── pros: add studio_name ────────────────────────────────────
-- Separates the pro's personal display name (what customers see)
-- from their studio/brand name.
-- Optional — not all pros have a named studio.

ALTER TABLE pros
  ADD COLUMN IF NOT EXISTS studio_name TEXT;
