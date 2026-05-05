-- ============================================================
-- MIGRATION 0021 — notifications table
-- In-app notification inbox. Rows are inserted server-side
-- (edge functions / API routes) when booking events occur.
-- Clients only SELECT and UPDATE (mark-read).
-- ============================================================

CREATE TABLE notifications (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        text NOT NULL,
  title       text NOT NULL,
  body        text NOT NULL,
  booking_id  uuid REFERENCES bookings(id) ON DELETE SET NULL,
  is_read     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON notifications (user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "notifications: own select" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can mark their own notifications as read (UPDATE only)
CREATE POLICY "notifications: own update" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);
