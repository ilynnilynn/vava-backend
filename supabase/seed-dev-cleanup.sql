-- ============================================================
-- VAVA DEV SEED CLEANUP — removes all test accounts
--
-- ⚠️  DEV / LOCAL ONLY — DO NOT RUN IN PRODUCTION ⚠️
--
-- Deletes all data created by seed-dev.sql.
-- Order respects FK constraints (children first, then parents).
--
-- Run:
--   psql $DATABASE_URL -f supabase/seed-dev-cleanup.sql
-- ============================================================

BEGIN;

DO $$
DECLARE
  v_customer_id     uuid := 'aaaaaaaa-0001-4000-a000-000000000001';
  v_pending_pro_id  uuid := 'aaaaaaaa-0002-4000-a000-000000000002';
  v_approved_pro_id uuid := 'aaaaaaaa-0003-4000-a000-000000000003';
  v_approved_pros_row_id uuid := 'bbbbbbbb-0003-4000-b000-000000000003';
  v_pending_pros_row_id  uuid := 'bbbbbbbb-0002-4000-b000-000000000002';
BEGIN

  -- ── Child tables first (FK order) ──

  -- Bookings by customer or either pro
  DELETE FROM bookings WHERE user_id = v_customer_id;
  DELETE FROM bookings WHERE pro_id IN (v_approved_pros_row_id, v_pending_pros_row_id);

  -- Notifications for customer
  DELETE FROM notifications WHERE user_id = v_customer_id;

  -- Liked pros
  DELETE FROM liked_pros WHERE user_id = v_customer_id;

  -- Ratings
  DELETE FROM ratings WHERE user_id = v_customer_id;
  DELETE FROM ratings WHERE pro_id IN (v_approved_pros_row_id, v_pending_pros_row_id);

  -- Slots
  DELETE FROM slots WHERE pro_id IN (v_approved_pros_row_id, v_pending_pros_row_id);

  -- Pro services
  DELETE FROM pro_services WHERE pro_id IN (v_approved_pros_row_id, v_pending_pros_row_id);

  -- Pro nail packages
  DELETE FROM pro_nail_packages WHERE pro_id IN (v_approved_pros_row_id, v_pending_pros_row_id);

  -- Pro special fiber prices
  DELETE FROM pro_special_fiber_prices WHERE pro_id IN (v_approved_pros_row_id, v_pending_pros_row_id);

  -- ── Pros ──
  DELETE FROM pros WHERE id IN (v_approved_pros_row_id, v_pending_pros_row_id);

  -- ── Users ──
  DELETE FROM public.users WHERE id = v_customer_id;

  -- ── Auth (cascade will also clean public tables, but we do it explicitly above) ──
  DELETE FROM auth.identities WHERE user_id IN (v_customer_id, v_pending_pro_id, v_approved_pro_id);
  DELETE FROM auth.users WHERE id IN (v_customer_id, v_pending_pro_id, v_approved_pro_id);

  RAISE NOTICE '✓ Dev seed data cleaned up.';

END $$;

COMMIT;
