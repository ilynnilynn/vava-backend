-- Add proposed_slot_id to bookings for reschedule flow.
-- When a customer requests a reschedule, the proposed new slot is stored here
-- so the pro can see it on their dashboard and approve/decline.
ALTER TABLE bookings
  ADD COLUMN proposed_slot_id UUID REFERENCES slots(id);
