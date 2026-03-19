-- ============================================================
-- MIGRATION 0005 — RLS: allow anon reads on public reference tables
--
-- service_style_modifiers, lash_special_fiber_tags, and
-- service_categories are read-only reference data that the
-- client-side onboarding flow needs to read without auth.
-- ============================================================

-- service_style_modifiers
ALTER TABLE service_style_modifiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read service_style_modifiers"
  ON service_style_modifiers
  FOR SELECT
  USING (true);

-- lash_special_fiber_tags
ALTER TABLE lash_special_fiber_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read lash_special_fiber_tags"
  ON lash_special_fiber_tags
  FOR SELECT
  USING (true);
