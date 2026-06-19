-- ============================================================
-- MIGRATION 0037 — Fix slots write RLS for correct ID model
--
-- The slots table schema:
--   slots.pro_id → pros.id  (auto-generated UUID)
--   pros.user_id = auth.uid()
--
-- The old policy "auth.uid() = pro_id" was correct only if
-- pros.id = auth.uid(), which was the original design intent
-- but was never implemented — pros.id is always auto-generated.
--
-- The correct check: the slot's pro_id must reference a pros
-- row whose user_id matches the logged-in user.
-- ============================================================

DROP POLICY IF EXISTS "slots: pro write" ON slots;

CREATE POLICY "slots: pro write" ON slots
  FOR ALL USING (
    auth.uid() = (SELECT user_id FROM pros WHERE id = pro_id)
  );
