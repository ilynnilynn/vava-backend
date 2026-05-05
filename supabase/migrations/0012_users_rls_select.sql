-- ============================================================
-- MIGRATION 0012 — RLS SELECT policy for users table
--
-- RLS is enabled on users (Supabase Dashboard default) but
-- no SELECT policy exists, so authenticated users cannot
-- read their own row via the anon/authenticated client.
--
-- The admin (service role) client bypasses RLS, which is why
-- writes via /api/user/onboard succeed but the /home server
-- component SELECT returns 0 rows.
-- ============================================================

-- Ensure RLS is enabled (idempotent)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own row
CREATE POLICY "Users can read own row"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own row (phone, birth_year, etc.)
CREATE POLICY "Users can update own row"
  ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
