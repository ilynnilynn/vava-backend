-- ============================================================
-- MIGRATION 0016 — Make reference-photos bucket public
--
-- reference-photos stores customer style/inspiration images.
-- Not sensitive data. getPublicUrl() requires the bucket to be
-- public; otherwise the generated URL returns 400.
-- ============================================================

UPDATE storage.buckets
SET public = true
WHERE id = 'reference-photos';

-- Replace the authenticated-only read policy with a public read
DROP POLICY IF EXISTS "reference-photos: authenticated read" ON storage.objects;

CREATE POLICY "reference-photos: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reference-photos');
