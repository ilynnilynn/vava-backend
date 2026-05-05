-- ============================================================
-- MIGRATION 0015 — Ensure public read access for customer search
--
-- The search page (/search?domain=nails|lashes) runs as an
-- unauthenticated or anon-key request. It needs to read:
--   - pros (approved + accepting only)
--   - pro_services
--   - slots
--
-- These policies may already exist from 0001 but the deployed DB
-- is missing them. Using DROP IF EXISTS + CREATE to be safe.
-- ============================================================

-- ── pros: allow anyone to read approved, accepting pros ──────
DROP POLICY IF EXISTS "pros: public read approved" ON pros;

CREATE POLICY "pros: public read approved" ON pros
  FOR SELECT
  USING (is_approved = true AND is_accepting = true);

-- ── pro_services: public read ────────────────────────────────
DROP POLICY IF EXISTS "pro_services: public read" ON pro_services;

CREATE POLICY "pro_services: public read" ON pro_services
  FOR SELECT
  USING (true);

-- ── slots: public read ──────────────────────────────────────
DROP POLICY IF EXISTS "slots: public read" ON slots;

CREATE POLICY "slots: public read" ON slots
  FOR SELECT
  USING (true);
