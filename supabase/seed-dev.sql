-- ============================================================
-- VAVA DEV SEED — test accounts for QA
--
-- ⚠️  DEV / LOCAL ONLY — DO NOT RUN IN PRODUCTION ⚠️
--
-- Creates 3 test accounts:
--   1. customer.test@vava.dev   — customer, can search/book
--   2. pro.pending@vava.dev     — pro, pending verification
--   3. pro.approved@vava.dev    — pro, approved, has slots + services
--
-- Prerequisites:
--   - All migrations have been applied
--   - service_categories exist (run 0035_seed_csv_services first if empty)
--
-- Run:
--   psql $DATABASE_URL -f supabase/seed-dev.sql
--   -- or via Supabase Dashboard → SQL Editor
--
-- Cleanup:
--   See bottom of file, or run supabase/seed-dev-cleanup.sql
-- ============================================================

BEGIN;

-- ── Deterministic UUIDs (predictable for test scripts) ──────
-- Using v5-style fixed UUIDs so re-running is idempotent.

DO $$
DECLARE
  v_customer_id    uuid := 'aaaaaaaa-0001-4000-a000-000000000001';
  v_pending_pro_id uuid := 'aaaaaaaa-0002-4000-a000-000000000002';
  v_approved_pro_id uuid := 'aaaaaaaa-0003-4000-a000-000000000003';
  v_approved_pros_row_id uuid := 'bbbbbbbb-0003-4000-b000-000000000003';
  v_pending_pros_row_id  uuid := 'bbbbbbbb-0002-4000-b000-000000000002';
  v_gel_cat_id     uuid;
  v_new_set_cat_id uuid;
  v_slot_base      timestamptz;
BEGIN

  -- ════════════════════════════════════════════════════════════
  -- 1. AUTH.USERS
  -- ════════════════════════════════════════════════════════════
  -- Supabase auth.users requires specific columns.
  -- We insert with a known bcrypt hash for password 'test1234'.
  -- This works on local `supabase start` and self-hosted instances.
  -- For hosted Supabase, use Dashboard → Authentication → Add User instead.

  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token
  )
  VALUES
    -- Customer
    (
      v_customer_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'customer.test@vava.dev',
      crypt('test1234', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Test Customer"}',
      now(), now(), '', ''
    ),
    -- Pending Pro
    (
      v_pending_pro_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'pro.pending@vava.dev',
      crypt('test1234', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Pending Pro"}',
      now(), now(), '', ''
    ),
    -- Approved Pro
    (
      v_approved_pro_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'pro.approved@vava.dev',
      crypt('test1234', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Approved Pro"}',
      now(), now(), '', ''
    )
  ON CONFLICT (id) DO NOTHING;

  -- auth.identities (required for email login to work)
  INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  )
  VALUES
    (
      v_customer_id, v_customer_id::text, v_customer_id,
      jsonb_build_object('sub', v_customer_id::text, 'email', 'customer.test@vava.dev'),
      'email', now(), now(), now()
    ),
    (
      v_pending_pro_id, v_pending_pro_id::text, v_pending_pro_id,
      jsonb_build_object('sub', v_pending_pro_id::text, 'email', 'pro.pending@vava.dev'),
      'email', now(), now(), now()
    ),
    (
      v_approved_pro_id, v_approved_pro_id::text, v_approved_pro_id,
      jsonb_build_object('sub', v_approved_pro_id::text, 'email', 'pro.approved@vava.dev'),
      'email', now(), now(), now()
    )
  ON CONFLICT (provider_id, provider) DO NOTHING;


  -- ════════════════════════════════════════════════════════════
  -- 2. PUBLIC.USERS (customer account)
  -- ════════════════════════════════════════════════════════════

  INSERT INTO public.users (
    id, display_name, phone, gender, created_at, updated_at
  )
  VALUES (
    v_customer_id,
    'QA Customer',
    '+886900000001',
    'female',
    now(), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    phone = EXCLUDED.phone;


  -- ════════════════════════════════════════════════════════════
  -- 3. PUBLIC.PROS — Pending pro
  -- ════════════════════════════════════════════════════════════
  -- Should appear in admin verification queue.
  -- Should NOT appear in booking results (is_approved=false).

  INSERT INTO public.pros (
    id, user_id, display_name, phone,
    ig_handle, studio_address, studio_district, studio_name,
    studio_lat, studio_lng,
    domains, nail_scope,
    is_approved, is_accepting, is_suspended,
    standing, subscription_status,
    verification_status, submitted_at,
    confirmed_booking_count, no_show_window_minutes,
    work_start_hour, work_end_hour,
    created_at, updated_at
  )
  VALUES (
    v_pending_pros_row_id,
    v_pending_pro_id,
    'Pending Pro',
    '+886900000002',
    'pending.pro.test',
    '台北市中正區忠孝西路一段 50 號',
    '台北市中正區',
    'Pending Nail Studio',
    25.046, 121.517,
    '{nails}', 'both',
    false,   -- is_approved
    false,   -- is_accepting (not yet approved)
    false,   -- is_suspended
    'good', 'free',
    'pending',                    -- verification_status
    now() - interval '2 hours',  -- submitted_at (submitted 2 hrs ago)
    0, 15,
    10, 20,
    now() - interval '1 day', now()
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    verification_status = EXCLUDED.verification_status,
    submitted_at = EXCLUDED.submitted_at,
    is_approved = EXCLUDED.is_approved;


  -- ════════════════════════════════════════════════════════════
  -- 4. PUBLIC.PROS — Approved pro
  -- ════════════════════════════════════════════════════════════
  -- Should appear in customer booking results.
  -- Filters: is_approved=true, is_accepting=true, standing!='suspended'

  INSERT INTO public.pros (
    id, user_id, display_name, phone,
    ig_handle, studio_address, studio_district, studio_name,
    studio_lat, studio_lng,
    domains, nail_scope,
    profile_photo_url, portfolio_urls,
    is_approved, is_accepting, is_suspended,
    standing, subscription_status,
    verification_status, submitted_at, reviewed_at,
    confirmed_booking_count, no_show_window_minutes,
    work_start_hour, work_end_hour,
    created_at, updated_at
  )
  VALUES (
    v_approved_pros_row_id,
    v_approved_pro_id,
    'Joy QA',
    '+886900000003',
    'joy.qa.nails',
    '台北市大安區忠孝東路四段 216 號 3 樓',
    '台北市大安區',
    'Joy QA Nail Studio',
    25.0418, 121.5534,            -- Da'an district coordinates
    '{nails,lashes}', 'both',
    NULL,                         -- profile_photo_url
    '{}',                         -- portfolio_urls (empty for now)
    true,   -- is_approved
    true,   -- is_accepting ← must be true for matching
    false,  -- is_suspended
    'good', 'free',
    'approved',
    now() - interval '7 days',    -- submitted_at
    now() - interval '6 days',    -- reviewed_at
    3, 15,
    10, 20,
    now() - interval '7 days', now()
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    is_approved = EXCLUDED.is_approved,
    is_accepting = EXCLUDED.is_accepting,
    verification_status = EXCLUDED.verification_status;


  -- ════════════════════════════════════════════════════════════
  -- 5. SERVICE CATEGORIES — ensure base categories exist
  -- ════════════════════════════════════════════════════════════
  -- The matching query joins pro_services → service_categories.
  -- We need at least 'gel' (nails) and 'new_set' (lashes) to exist.
  -- Insert only if not already present (no unique constraint on name).

  INSERT INTO service_categories (name, name_zh, domain, has_styles, is_standalone, sort_order)
  SELECT name, name_zh, domain::domain_type, has_styles, is_standalone, sort_order
  FROM (VALUES
    ('gel',             '凝膠',     'nails',  true,  true,  1),
    ('nail_removal',    '卸甲',     'nails',  true,  true,  2),
    ('extension',       '延甲',     'nails',  true,  false, 3),
    ('treatment',       '保養',     'nails',  true,  true,  4),
    ('repair',          '修補',     'nails',  true,  true,  5),
    ('new_set',         '嫁接',     'lashes', true,  true,  1),
    ('lash_removal',    '卸睫',     'lashes', true,  true,  2),
    ('lash_management', '睫毛管理', 'lashes', true,  true,  3)
  ) AS v(name, name_zh, domain, has_styles, is_standalone, sort_order)
  WHERE NOT EXISTS (
    SELECT 1 FROM service_categories sc WHERE sc.name = v.name
  );


  -- ════════════════════════════════════════════════════════════
  -- 6. PRO SERVICES — approved pro's pricing
  -- ════════════════════════════════════════════════════════════

  -- Look up category IDs
  SELECT id INTO v_gel_cat_id FROM service_categories WHERE name = 'gel' LIMIT 1;
  SELECT id INTO v_new_set_cat_id FROM service_categories WHERE name = 'new_set' LIMIT 1;

  -- Nails: gel service
  IF v_gel_cat_id IS NOT NULL THEN
    INSERT INTO pro_services (pro_id, category_id, price_ntd, duration_minutes, is_enabled)
    VALUES (v_approved_pros_row_id, v_gel_cat_id, 800, 60, true)
    ON CONFLICT (pro_id, category_id) DO UPDATE SET
      price_ntd = EXCLUDED.price_ntd,
      is_enabled = true;
  END IF;

  -- Lashes: new set service
  IF v_new_set_cat_id IS NOT NULL THEN
    INSERT INTO pro_services (pro_id, category_id, price_ntd, duration_minutes, is_enabled)
    VALUES (v_approved_pros_row_id, v_new_set_cat_id, 1200, 90, true)
    ON CONFLICT (pro_id, category_id) DO UPDATE SET
      price_ntd = EXCLUDED.price_ntd,
      is_enabled = true;
  END IF;


  -- ════════════════════════════════════════════════════════════
  -- 7. SLOTS — approved pro's available slots
  -- ════════════════════════════════════════════════════════════
  -- Creates 30-min slots for today + tomorrow + day after.
  -- Morning (10:00–12:00) + Afternoon (14:00–17:00).
  -- All unbooked, unexpired.

  -- Clear existing seed slots for this pro to avoid duplicates
  DELETE FROM slots WHERE pro_id = v_approved_pros_row_id;

  -- Generate slots for 3 days × 2 blocks
  FOR i IN 0..2 LOOP
    v_slot_base := date_trunc('day', now()) + (i || ' days')::interval;

    -- Morning block: 10:00, 10:30, 11:00, 11:30
    INSERT INTO slots (pro_id, starts_at, is_booked, is_expired)
    VALUES
      (v_approved_pros_row_id, v_slot_base + interval '10 hours',           false, false),
      (v_approved_pros_row_id, v_slot_base + interval '10 hours 30 minutes', false, false),
      (v_approved_pros_row_id, v_slot_base + interval '11 hours',           false, false),
      (v_approved_pros_row_id, v_slot_base + interval '11 hours 30 minutes', false, false),
      -- Afternoon block: 14:00, 14:30, 15:00, 15:30, 16:00, 16:30
      (v_approved_pros_row_id, v_slot_base + interval '14 hours',           false, false),
      (v_approved_pros_row_id, v_slot_base + interval '14 hours 30 minutes', false, false),
      (v_approved_pros_row_id, v_slot_base + interval '15 hours',           false, false),
      (v_approved_pros_row_id, v_slot_base + interval '15 hours 30 minutes', false, false),
      (v_approved_pros_row_id, v_slot_base + interval '16 hours',           false, false),
      (v_approved_pros_row_id, v_slot_base + interval '16 hours 30 minutes', false, false)
    ON CONFLICT (pro_id, starts_at) DO NOTHING;
  END LOOP;

  -- Mark past slots as expired (slots before now)
  UPDATE slots
  SET is_expired = true
  WHERE pro_id = v_approved_pros_row_id
    AND starts_at < now();

END $$;

COMMIT;


-- ============================================================
-- VERIFICATION QUERIES — run after seeding to confirm
-- ============================================================
--
-- Check auth users:
--   SELECT id, email FROM auth.users WHERE email LIKE '%@vava.dev';
--
-- Check public users:
--   SELECT id, display_name, phone FROM public.users
--   WHERE id = 'aaaaaaaa-0001-4000-a000-000000000001';
--
-- Check pros:
--   SELECT id, display_name, is_approved, is_accepting, verification_status
--   FROM public.pros WHERE user_id IN (
--     'aaaaaaaa-0002-4000-a000-000000000002',
--     'aaaaaaaa-0003-4000-a000-000000000003'
--   );
--
-- Check approved pro's slots:
--   SELECT id, starts_at, is_booked, is_expired FROM slots
--   WHERE pro_id = 'bbbbbbbb-0003-4000-b000-000000000003'
--   ORDER BY starts_at;
--
-- Check approved pro's services:
--   SELECT ps.price_ntd, ps.duration_minutes, sc.name, sc.domain
--   FROM pro_services ps
--   JOIN service_categories sc ON sc.id = ps.category_id
--   WHERE ps.pro_id = 'bbbbbbbb-0003-4000-b000-000000000003';
--
-- Simulate matching query (should return approved pro):
--   SELECT p.display_name, p.is_approved, p.is_accepting, p.standing
--   FROM pros p
--   WHERE p.is_approved = true
--     AND p.is_accepting = true
--     AND p.standing != 'suspended';
