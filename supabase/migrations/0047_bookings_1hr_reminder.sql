-- ============================================================
-- MIGRATION 0047 — Add 1-hour reminder tracking to bookings
-- ============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS reminder_1hr_sent_at timestamptz;
