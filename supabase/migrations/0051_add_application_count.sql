-- Add application_count to track how many times a pro has submitted
-- their application. Preserved across reapplies (rejection data is
-- no longer cleared on reapply per CEO directive).
ALTER TABLE pros
  ADD COLUMN IF NOT EXISTS application_count INTEGER NOT NULL DEFAULT 1;
