-- ============================================================
-- MIGRATION 0031 — Fix pros write policy: id → user_id
--
-- The live DB has an old policy: auth.uid() = id
-- (from when pros.id was set to auth.uid() directly).
--
-- Since migration 0029 added user_id as the auth FK, the upsert
-- now passes user_id = session.user.id. The old policy fails because
-- id is auto-generated and does not equal auth.uid().
--
-- Fix: replace with auth.uid() = user_id.
-- ============================================================

DROP POLICY IF EXISTS "pros: own write" ON pros;

CREATE POLICY "pros: own write" ON pros
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
