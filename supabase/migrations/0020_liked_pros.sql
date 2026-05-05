-- ============================================================
-- MIGRATION 0020 — liked_pros table
-- Stores which pros a customer has favourited.
-- ============================================================

CREATE TABLE liked_pros (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pro_id      uuid NOT NULL REFERENCES pros(id)  ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, pro_id)
);

ALTER TABLE liked_pros ENABLE ROW LEVEL SECURITY;

-- Customers can read and manage their own rows only
CREATE POLICY "liked_pros: own rows" ON liked_pros
  FOR ALL USING (auth.uid() = user_id);
