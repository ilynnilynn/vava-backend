-- ============================================================
-- MIGRATION 0008 — Pro onboarding columns
--
-- Adds columns to pros that the onboarding wizard writes:
--   - nail_scope: hands/feet/both (text, not using the booking enum)
--   - id_photo_path: Supabase Storage path for ID photo
--
-- Adds unique constraint on pro_services for upsert support.
-- ============================================================

-- ── pros: onboarding fields ────────────────────────────────

ALTER TABLE pros
  ADD COLUMN IF NOT EXISTS nail_scope     TEXT
    CHECK (nail_scope IN ('hands', 'feet', 'both'));

ALTER TABLE pros
  ADD COLUMN IF NOT EXISTS id_photo_path  TEXT;

-- ── pro_services: unique constraint for upsert ─────────────

ALTER TABLE pro_services
  ADD CONSTRAINT pro_services_pro_category_unique
    UNIQUE (pro_id, category_id);
