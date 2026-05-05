-- 0034_body_part.sql — Add body_part column to pro_services
ALTER TABLE pro_services ADD COLUMN IF NOT EXISTS body_part TEXT;
