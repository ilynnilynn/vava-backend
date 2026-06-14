-- MIGRATION 0044 — Add hand/foot split columns to bookings
-- For 手+腳 (hand+foot) nail bookings, we need to preserve which
-- service categories, style, and treatment tier apply to which scope.
-- The existing service_category_ids stays as the flat union for backward compat.

ALTER TABLE bookings
  ADD COLUMN hand_category_ids   uuid[],
  ADD COLUMN hand_style_id       uuid REFERENCES service_style_modifiers(id),
  ADD COLUMN hand_treatment_tier treatment_tier,
  ADD COLUMN foot_category_ids   uuid[],
  ADD COLUMN foot_style_id       uuid REFERENCES service_style_modifiers(id),
  ADD COLUMN foot_treatment_tier treatment_tier;

COMMENT ON COLUMN bookings.hand_category_ids IS 'Service categories for hand scope when nail_scope = both';
COMMENT ON COLUMN bookings.foot_category_ids IS 'Service categories for foot scope when nail_scope = both';
