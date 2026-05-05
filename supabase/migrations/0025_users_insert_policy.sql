-- ============================================================
-- MIGRATION 0025 — Add INSERT policy for users table
--
-- The remote DB was seeded manually before migrations ran,
-- so the original "users: own row for all" policy from 0001
-- was never applied. Only SELECT + UPDATE policies from 0012
-- exist. Without an INSERT policy, upsert of a new row fails
-- with "new row violates row-level security policy".
-- ============================================================

CREATE POLICY "users: insert own row"
  ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);
