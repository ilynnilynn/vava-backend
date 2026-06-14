-- ============================================================
-- MIGRATION 0049 — Align ratings table with live schema
--
-- The live DB already has rater_type/rater_id/ratee_id/is_public/
-- flagged/flagged_reason columns, but no migration file existed
-- to create them. This migration is idempotent — it only adds
-- columns if they don't already exist.
--
-- Also adds bookings.rating_prompt_sent if missing.
-- ============================================================

-- ── ratings table ─────────────────────────────────────────────

DO $$
BEGIN
  -- Add rater_type if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ratings' AND column_name = 'rater_type'
  ) THEN
    ALTER TABLE ratings ADD COLUMN rater_type text NOT NULL DEFAULT 'customer';
  END IF;

  -- Add rater_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ratings' AND column_name = 'rater_id'
  ) THEN
    ALTER TABLE ratings ADD COLUMN rater_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
  END IF;

  -- Add ratee_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ratings' AND column_name = 'ratee_id'
  ) THEN
    ALTER TABLE ratings ADD COLUMN ratee_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
  END IF;

  -- Add is_public if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ratings' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE ratings ADD COLUMN is_public boolean NOT NULL DEFAULT true;
  END IF;

  -- Add stars (rename score if it exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ratings' AND column_name = 'score'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ratings' AND column_name = 'stars'
  ) THEN
    ALTER TABLE ratings RENAME COLUMN score TO stars;
  END IF;

  -- Add comment (rename note if it exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ratings' AND column_name = 'note'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ratings' AND column_name = 'comment'
  ) THEN
    ALTER TABLE ratings RENAME COLUMN note TO comment;
  END IF;

  -- Add flagged if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ratings' AND column_name = 'flagged'
  ) THEN
    ALTER TABLE ratings ADD COLUMN flagged boolean NOT NULL DEFAULT false;
  END IF;

  -- Add flagged_reason if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ratings' AND column_name = 'flagged_reason'
  ) THEN
    ALTER TABLE ratings ADD COLUMN flagged_reason text;
  END IF;
END $$;

-- ── bookings.rating_prompt_sent ───────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'rating_prompt_sent'
  ) THEN
    ALTER TABLE bookings ADD COLUMN rating_prompt_sent boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ── Drop old unique constraint and add new one ────────────────
-- Old: unique(booking_id) — allows only one rating per booking total
-- New: unique(booking_id, rater_type) — allows one per booking per rater type

DO $$
BEGIN
  -- Drop old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ratings_booking_id_key' AND conrelid = 'ratings'::regclass
  ) THEN
    ALTER TABLE ratings DROP CONSTRAINT ratings_booking_id_key;
  END IF;

  -- Add new constraint if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ratings_booking_id_rater_type_key' AND conrelid = 'ratings'::regclass
  ) THEN
    ALTER TABLE ratings ADD CONSTRAINT ratings_booking_id_rater_type_key
      UNIQUE (booking_id, rater_type);
  END IF;
END $$;
