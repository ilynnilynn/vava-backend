-- MIGRATION 0050 — Remove pro_application_declined DB trigger
-- In-app notifications for decline are now handled in the API route
-- via notify() (dual delivery: in-app + push). Keeping the trigger
-- would cause duplicate in-app notifications.

DROP TRIGGER IF EXISTS trg_pro_application_declined ON pros;
DROP FUNCTION IF EXISTS notify_pro_application_declined();
