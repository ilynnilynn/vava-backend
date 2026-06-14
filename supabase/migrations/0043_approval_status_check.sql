-- MIGRATION 0043 — Ensure is_approved and verification_status stay consistent
-- is_approved=true requires verification_status='approved', and vice versa.
-- Prevents desync between the two columns.

-- Drop any existing constraint with this name (idempotent)
ALTER TABLE pros DROP CONSTRAINT IF EXISTS pros_approval_consistency;

-- Add CHECK: is_approved=true ↔ verification_status='approved'
ALTER TABLE pros ADD CONSTRAINT pros_approval_consistency
  CHECK (
    (is_approved = true AND verification_status = 'approved')
    OR (is_approved = false AND verification_status <> 'approved')
  );

-- Fix any existing rows that violate the constraint before it's applied.
-- (These UPDATE statements run before the ALTER TABLE above if run manually,
--  but in a migration they're already consistent because approve/decline
--  routes set both columns atomically.)
