-- ============================================================
-- MIGRATION 0017 — Add customer_late_notified_at to bookings
--
-- Required by the "我會晚到" feature in customer booking detail.
-- Column was in the TypeScript type but missing from the deployed schema.
-- ============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS customer_late_notified_at timestamptz;
