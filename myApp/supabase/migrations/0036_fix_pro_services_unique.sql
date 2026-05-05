-- 0036_fix_pro_services_unique.sql
-- Replace the old (pro_id, category_id) unique constraint with one
-- that accounts for style_id + body_part, since a pro can offer
-- multiple styles within the same category (e.g. gel → solid, french)
-- and the same style for hand vs foot.
--
-- Uses COALESCE to handle NULLs (Postgres UNIQUE treats NULL != NULL).

ALTER TABLE pro_services
  DROP CONSTRAINT IF EXISTS pro_services_pro_category_unique;

CREATE UNIQUE INDEX IF NOT EXISTS pro_services_unique_combo
  ON pro_services (
    pro_id,
    category_id,
    COALESCE(style_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(body_part, '__null__')
  );
