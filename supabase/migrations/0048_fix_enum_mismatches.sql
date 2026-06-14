-- ============================================================
-- MIGRATION 0048 — Fix enum mismatches (P0-1, P0-2)
--
-- P0-1: nail_scope enum has ('both_hands','single_hand','repair')
--        but TS/app sends ('hands','feet','both')
--
-- P0-2: treatment_tier enum has ('basic','standard','premium')
--        but TS/app sends ('basic','deep')
--
-- PostgreSQL >= 10 supports ALTER TYPE ... RENAME VALUE.
-- We rename existing values and add missing ones.
-- ============================================================

-- ── P0-1: nail_scope ──────────────────────────────────────────
-- both_hands → both, single_hand → hands, repair → feet (repurpose)
-- Note: 'repair' was never used; repurposing it to 'feet'.

ALTER TYPE nail_scope RENAME VALUE 'both_hands' TO 'both';
ALTER TYPE nail_scope RENAME VALUE 'single_hand' TO 'hands';
ALTER TYPE nail_scope RENAME VALUE 'repair' TO 'feet';

-- ── P0-2: treatment_tier ─────────────────────────────────────
-- 'basic' stays. 'standard' → 'deep'. Remove 'premium' by renaming
-- to 'deep' would collide, so we rename 'standard' first.
-- Since we can't remove enum values in Postgres, we rename 'standard'
-- to 'deep' and leave 'premium' as a dead value (never inserted).

ALTER TYPE treatment_tier RENAME VALUE 'standard' TO 'deep';
-- 'premium' is now unused but harmless — Postgres doesn't support
-- dropping enum values without recreating the type.
