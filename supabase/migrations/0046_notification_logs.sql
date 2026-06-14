-- ============================================================
-- MIGRATION 0046 — notification_logs table
-- Send history and audit trail for all notification dispatches.
-- ============================================================

CREATE TABLE notification_logs (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel        text NOT NULL,  -- 'line', 'push', 'in_app'
  type           text NOT NULL,  -- notification type key
  booking_id     uuid REFERENCES bookings(id) ON DELETE SET NULL,
  success        boolean NOT NULL DEFAULT true,
  error_message  text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON notification_logs (user_id, created_at DESC);
CREATE INDEX ON notification_logs (booking_id);
CREATE INDEX ON notification_logs (created_at DESC);

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- No user-facing RLS — accessed via admin client only
