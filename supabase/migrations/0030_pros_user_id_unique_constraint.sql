-- ============================================================
-- MIGRATION 0030 — Fix pros.user_id unique index → unique constraint
--
-- Migration 0029 created a partial unique index (WHERE user_id IS NOT NULL)
-- which PostgreSQL's ON CONFLICT clause cannot use. Supabase upsert with
-- onConflict: 'user_id' therefore throws:
--   "there is no unique or exclusion constraint matching the ON CONFLICT spec"
--
-- Fix: replace with a full unique constraint. PostgreSQL allows multiple NULLs
-- in a unique constraint (NULL ≠ NULL), so existing rows with NULL user_id
-- are unaffected.
-- ============================================================

DROP INDEX IF EXISTS pros_user_id_unique;

ALTER TABLE pros
  ADD CONSTRAINT pros_user_id_unique UNIQUE (user_id);
