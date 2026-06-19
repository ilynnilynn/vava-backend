-- MIGRATION 0042 — Auto-create notification when pro application is declined
-- When verification_status changes to 'declined', insert a notification
-- with rejection_reasons + rejection_note so the user knows why.

-- ── Function ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_pro_application_declined()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_body   text;
  v_reason text;
BEGIN
  -- Only fire when status actually changes TO 'declined'
  IF NEW.verification_status IS NOT DISTINCT FROM OLD.verification_status THEN
    RETURN NEW;
  END IF;

  IF NEW.verification_status <> 'declined' THEN
    RETURN NEW;
  END IF;

  -- Build body from rejection_reasons (JSONB array) + rejection_note
  v_body := '原因：';

  IF NEW.rejection_reasons IS NOT NULL
     AND jsonb_array_length(NEW.rejection_reasons) > 0
  THEN
    FOR v_reason IN
      SELECT jsonb_array_elements_text(NEW.rejection_reasons)
    LOOP
      v_body := v_body || E'\n' || chr(8226) || ' ' || v_reason;
    END LOOP;
  ELSE
    v_body := v_body || E'\n' || chr(8226) || ' 未提供具體原因';
  END IF;

  -- Append rejection_note if present
  IF NEW.rejection_note IS NOT NULL
     AND trim(NEW.rejection_note) <> ''
  THEN
    v_body := v_body || E'\n\n' || '備註：' || trim(NEW.rejection_note);
  END IF;

  v_body := v_body || E'\n\n' || '請修正後重新申請。';

  -- Insert notification (bypasses RLS via SECURITY DEFINER)
  INSERT INTO notifications (user_id, type, title, body)
  VALUES (
    NEW.user_id,
    'pro_application_declined',
    '設計師申請未通過',
    v_body
  );

  RETURN NEW;
END;
$$;

-- ── Trigger ───────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_pro_application_declined ON pros;

CREATE TRIGGER trg_pro_application_declined
  AFTER UPDATE ON pros
  FOR EACH ROW
  EXECUTE FUNCTION notify_pro_application_declined();
