-- ============================================================
-- MIGRATION 0038 — Dev-only safe user cleanup function
--
-- WHY: Deleting from Supabase Auth fails with FK errors because
-- bookings/ratings/flags have no ON DELETE CASCADE.
-- Those tables intentionally lack CASCADE (they are audit records).
--
-- This function deletes all rows for a given auth.uid in the
-- correct dependency order so Auth deletion succeeds.
--
-- DO NOT call this in production user flows.
-- It is intended for: local dev, test user teardown, and the
-- Supabase dashboard SQL editor when clearing test accounts.
--
-- Usage:
--   SELECT dev_delete_user('paste-auth-uid-here');
--
-- After this runs, the auth.users row is already deleted
-- (step 9 inside the function). No further action needed.
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
  SELECT id   INTO v_user_id FROM public.users WHERE id       = target_auth_uid;
  SELECT id   INTO v_pro_id  FROM public.pros  WHERE user_id  = target_auth_uid;

  -- ── 1. flags ────────────────────────────────────────────────
  -- flags.booking_id → bookings(id) RESTRICT
  -- Must go before bookings.
  DELETE FROM public.flags
  WHERE booking_id IN (
    SELECT id FROM public.bookings
    WHERE (v_user_id IS NOT NULL AND user_id = v_user_id)
       OR (v_pro_id  IS NOT NULL AND pro_id  = v_pro_id)
  );

  -- ── 2. ratings ───────────────────────────────────────────────
  -- ratings.user_id → users(id) RESTRICT
  -- ratings.pro_id  → pros(id)  RESTRICT
  -- ratings.booking_id → bookings(id) RESTRICT
  DELETE FROM public.ratings
  WHERE (v_user_id IS NOT NULL AND user_id = v_user_id)
     OR (v_pro_id  IS NOT NULL AND pro_id  = v_pro_id);

  -- ── 3. notifications ─────────────────────────────────────────
  -- notifications.user_id → users(id) ON DELETE CASCADE
  -- Already cascades, but delete explicitly to be safe.
  IF v_user_id IS NOT NULL THEN
    DELETE FROM public.notifications WHERE user_id = v_user_id;
  END IF;

  -- ── 4. liked_pros ────────────────────────────────────────────
  -- liked_pros.user_id → users(id) ON DELETE CASCADE
  -- liked_pros.pro_id  → pros(id)  ON DELETE CASCADE
  -- Already cascades, but delete explicitly.
  DELETE FROM public.liked_pros
  WHERE (v_user_id IS NOT NULL AND user_id = v_user_id)
     OR (v_pro_id  IS NOT NULL AND pro_id  = v_pro_id);

  -- ── 5. bookings ──────────────────────────────────────────────
  -- bookings.user_id → users(id) RESTRICT  ← primary blocker
  -- bookings.pro_id  → pros(id)  RESTRICT  ← primary blocker
  -- bookings.slot_id → slots(id) RESTRICT  ← blocks slot cascade
  DELETE FROM public.bookings
  WHERE (v_user_id IS NOT NULL AND user_id = v_user_id)
     OR (v_pro_id  IS NOT NULL AND pro_id  = v_pro_id);

  -- ── 6. slots ─────────────────────────────────────────────────
  -- slots.pro_id → pros(id) ON DELETE CASCADE
  -- Would cascade, but bookings (now gone) held slot_id refs.
  IF v_pro_id IS NOT NULL THEN
    DELETE FROM public.slots WHERE pro_id = v_pro_id;
  END IF;

  -- ── 7. pro profile tables ────────────────────────────────────
  -- All cascade from pros(id), but be explicit for clarity.
  IF v_pro_id IS NOT NULL THEN
    DELETE FROM public.pro_special_fiber_prices WHERE pro_id = v_pro_id;
    DELETE FROM public.pro_services             WHERE pro_id = v_pro_id;
    DELETE FROM public.pro_nail_packages        WHERE pro_id = v_pro_id;
    DELETE FROM public.pros                     WHERE id     = v_pro_id;
  END IF;

  -- ── 8. users row ─────────────────────────────────────────────
  -- users.id → auth.users(id) ON DELETE CASCADE (reverse: must go before auth)
  IF v_user_id IS NOT NULL THEN
    DELETE FROM public.users WHERE id = v_user_id;
  END IF;

  -- ── 9. auth.users ────────────────────────────────────────────
  -- All FK blockers above are now cleared.
  DELETE FROM auth.users WHERE id = target_auth_uid;

END;
$$;
