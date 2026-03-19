-- ============================================================
-- MIGRATION 0002 — additions to initial schema
-- Run in: Supabase Dashboard → SQL Editor
--
-- Adds columns that were referenced in the build plan but
-- missing from 0001_initial_schema.sql
-- ============================================================

-- ── pros ─────────────────────────────────────────────────────

-- is_accepting: pro's "Accepting Requests Now" toggle.
-- Default false — pro must explicitly opt in after approval.
ALTER TABLE pros
  ADD COLUMN IF NOT EXISTS is_accepting   BOOLEAN     NOT NULL DEFAULT false;

-- submitted_at: timestamp when pro submitted profile for review.
-- Used in admin queue to sort by submission order.
ALTER TABLE pros
  ADD COLUMN IF NOT EXISTS submitted_at   TIMESTAMPTZ;

-- gender: set by admin during review. Not editable self-serve.
ALTER TABLE pros
  ADD COLUMN IF NOT EXISTS gender         TEXT
    CHECK (gender IN ('male', 'female', 'non-binary'));

-- ig_handle: required at onboarding. Used on pro profile page.
ALTER TABLE pros
  ADD COLUMN IF NOT EXISTS ig_handle      TEXT;

-- ── users ────────────────────────────────────────────────────

-- is_admin: true for internal VAVA ops accounts.
-- Used to gate the /admin/* route group.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_admin       BOOLEAN     NOT NULL DEFAULT false;

-- ── bookings ─────────────────────────────────────────────────

-- rating_prompt_sent: true once the 1hr post-completion LINE
-- message has been sent. Prevents duplicate rating prompts.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS rating_prompt_sent BOOLEAN NOT NULL DEFAULT false;

-- ── RLS policies for new columns ─────────────────────────────
-- No new policies needed — new columns inherit RLS from their tables.
-- is_admin is only read server-side (service role), never exposed via RLS.
