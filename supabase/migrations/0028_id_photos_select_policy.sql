-- ============================================================
-- MIGRATION 0028 — id-photos: add SELECT policy for upsert
--
-- Without a SELECT policy, Supabase Storage's upsert:true
-- cannot check if the object already exists, which causes the
-- INSERT path to fail with "new row violates row-level security
-- policy" even though the INSERT policy is correctly defined.
--
-- This policy allows pros to read only their own ID photos.
-- Admin/service role bypasses RLS entirely for admin access.
-- ============================================================

DROP POLICY IF EXISTS "id-photos: pro select own" ON storage.objects;
CREATE POLICY "id-photos: pro select own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'id-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
