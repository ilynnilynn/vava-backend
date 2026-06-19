-- Add 'draft' status and rename 'rejected' to 'declined' for terminology consistency.
-- Default changes from 'pending' to 'draft' so new rows start invisible to admins.
-- Only submitted.tsx sets verification_status = 'pending' on successful upsert.

-- 1. Rename existing 'rejected' rows BEFORE dropping the constraint
UPDATE pros
SET verification_status = 'declined'
WHERE verification_status = 'rejected';

-- 2. Drop old check constraint (includes 'rejected', excludes 'draft')
ALTER TABLE pros DROP CONSTRAINT IF EXISTS pros_verification_status_check;

-- 3. Add new constraint with 'draft' and 'declined'
ALTER TABLE pros ADD CONSTRAINT pros_verification_status_check
  CHECK (verification_status IN ('draft', 'pending', 'approved', 'declined'));

-- 4. Change default so new rows start as 'draft'
ALTER TABLE pros ALTER COLUMN verification_status SET DEFAULT 'draft';

-- 5. Backfill: 'pending' rows with no submitted_at are incomplete → set to 'draft'
UPDATE pros
SET verification_status = 'draft'
WHERE verification_status = 'pending'
  AND submitted_at IS NULL;
