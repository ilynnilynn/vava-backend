-- ============================================================
-- Fix slots RLS policy
--
-- The existing policy uses:
--   auth.uid() = (select user_id from pros where id = pro_id)
--
-- But the app sets pros.id = auth.uid() directly (see upsertPro).
-- The subquery lookup via user_id is wrong — just compare
-- auth.uid() to pro_id directly.
-- ============================================================

DROP POLICY IF EXISTS "slots: pro write" ON slots;

CREATE POLICY "slots: pro write" ON slots
  FOR ALL USING (
    auth.uid() = pro_id
  );
