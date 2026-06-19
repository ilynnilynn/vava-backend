-- ============================================================
-- MIGRATION 0036 — Deduplicate slots and add unique constraint
--
-- The remote slots table is missing UNIQUE (pro_id, starts_at)
-- and has accumulated duplicate rows (same pro_id + starts_at).
--
-- Step 1: Remove duplicate rows, keeping the most recently
--         created row for each (pro_id, starts_at) pair.
--
-- Step 2: Create the unique index so future upserts work.
-- ============================================================

-- Step 1: Delete duplicates — keep the row with the largest id
-- (uuid v4 ordering by created_at is unreliable, so we use ctid
--  as a stable last-resort tiebreaker instead)
DELETE FROM public.slots
WHERE id NOT IN (
  SELECT DISTINCT ON (pro_id, starts_at) id
  FROM public.slots
  ORDER BY pro_id, starts_at, created_at DESC, id DESC
);

-- Step 2: Create the unique index (IF NOT EXISTS is safe on
-- environments that already have the constraint)
CREATE UNIQUE INDEX IF NOT EXISTS slots_pro_id_starts_at_key
  ON public.slots (pro_id, starts_at);
