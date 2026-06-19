-- ============================================================
-- MIGRATION 0039 — Fix dev_delete_user() column names
--
-- 0038 used wrong column names for public.ratings:
--   ratings.user_id → does not exist (actual: rater_id)
--   ratings.pro_id  → does not exist (actual: ratee_id)
--
-- This migration replaces the function with corrected logic
-- verified against the live schema dump.
--
-- Live ratings schema:
--   rater_id   uuid  — who wrote the rating (user or pro id)
--   ratee_id   uuid  — who was rated
--   rater_type text  — 'customer' | 'pro'
--   booking_id uuid  — FK → bookings(id), no cascade
--
-- Strategy: delete ratings by booking_id (safest — covers all
-- rater/ratee combinations without needing to know rater_type).
--
-- DO NOT call this in production flows.
-- Usage: SELECT dev_delete_user('auth-uid-here');
-- ============================================================

CREATE OR REPLACE FUNCTION dev_delete_user(target_auth_uid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_pro_id  uuid;
BEGIN
  -- Resolve public row IDs from the auth UID
  SELECT id INTO v_user_id FROM public.users WHERE id      = target_auth_uid;
  SELECT id INTO v_pro_id  FROM public.pros  WHERE user_id = target_auth_uid;

  -- ── 1. flags ────────────────────────────────────────────────
  -- flags.booking_id → bookings(id) RESTRICT — must go before bookings.
  -- Also covers flags where flagged_id = v_user_id or v_pro_id.
  DELETE FROM public.flags
  WHERE booking_id IN (
    SELECT id FROM public.bookings
    WHERE (v_user_id IS NOT NULL AND user_id = v_user_id)
       OR (v_pro_id  IS NOT NULL AND pro_id  = v_pro_id)
  );

  -- ── 2. ratings ───────────────────────────────────────────────
  -- Live schema uses rater_id / ratee_id — NOT user_id / pro_id.
  -- ratings.booking_id → bookings(id) RESTRICT — must go before bookings.
  -- Delete by booking_id to catch all rater_type combinations.
  DELETE FROM public.ratings
  WHERE booking_id IN (
    SELECT id FROM public.bookings
    WHERE (v_user_id IS NOT NULL AND user_id = v_user_id)
       OR (v_pro_id  IS NOT NULL AND pro_id  = v_pro_id)
  );
  -- Also catch any ratings not linked to a booking but referencing these IDs directly.
  DELETE FROM public.ratings
  WHERE (v_user_id IS NOT NULL AND rater_id = v_user_id)
     OR (v_user_id IS NOT NULL AND ratee_id = v_user_id)
     OR (v_pro_id  IS NOT NULL AND rater_id = v_pro_id)
     OR (v_pro_id  IS NOT NULL AND ratee_id = v_pro_id);

  -- ── 3. notifications ─────────────────────────────────────────
  -- notifications.user_id → users(id) ON DELETE CASCADE (already cascades).
  -- Delete explicitly to keep order predictable.
  IF v_user_id IS NOT NULL THEN
    DELETE FROM public.notifications WHERE user_id = v_user_id;
  END IF;

  -- ── 4. liked_pros ────────────────────────────────────────────
  -- liked_pros.user_id → users(id) ON DELETE CASCADE.
  -- liked_pros.pro_id  → pros(id)  ON DELETE CASCADE.
  DELETE FROM public.liked_pros
  WHERE (v_user_id IS NOT NULL AND user_id = v_user_id)
     OR (v_pro_id  IS NOT NULL AND pro_id  = v_pro_id);

  -- ── 5. bookings ──────────────────────────────────────────────
  -- bookings.user_id        → users(id) RESTRICT  ← primary blocker
  -- bookings.pro_id         → pros(id)  RESTRICT  ← primary blocker
  -- bookings.slot_id        → slots(id) RESTRICT  ← blocks slot cascade
  -- bookings.proposed_slot_id → slots(id) RESTRICT ← also blocks slot cascade
  -- Deleting bookings here clears all slot FK references before slots are removed.
  DELETE FROM public.bookings
  WHERE (v_user_id IS NOT NULL AND user_id = v_user_id)
     OR (v_pro_id  IS NOT NULL AND pro_id  = v_pro_id);

  -- ── 6. slots ─────────────────────────────────────────────────
  -- slots.pro_id → pros(id) RESTRICT in live schema (no cascade shown in dump).
  -- Bookings (including proposed_slot_id refs) are already gone above.
  IF v_pro_id IS NOT NULL THEN
    DELETE FROM public.slots WHERE pro_id = v_pro_id;
  END IF;

  -- ── 7. pro profile tables ────────────────────────────────────
  -- All have pro_id → pros(id) with no cascade in live schema.
  IF v_pro_id IS NOT NULL THEN
    DELETE FROM public.pro_special_fiber_prices WHERE pro_id = v_pro_id;
    DELETE FROM public.pro_services             WHERE pro_id = v_pro_id;
    DELETE FROM public.pro_nail_packages        WHERE pro_id = v_pro_id;
    DELETE FROM public.pros                     WHERE id     = v_pro_id;
  END IF;

  -- ── 8. users row (public) ────────────────────────────────────
  IF v_user_id IS NOT NULL THEN
    DELETE FROM public.users WHERE id = v_user_id;
  END IF;

  -- ── 9. auth.users ────────────────────────────────────────────
  -- All FK blockers cleared. auth.users deletion is now safe.
  DELETE FROM auth.users WHERE id = target_auth_uid;

END;
$$;
