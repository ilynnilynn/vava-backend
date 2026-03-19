-- ============================================================
-- MIGRATION 0010 — Recreate storage policies
--
-- Ensures all storage RLS policies exist. Migration 0006 may
-- not have been applied to the live database.
-- Uses DROP IF EXISTS + CREATE to be idempotent.
-- ============================================================

-- ── portfolio-photos ───────────────────────────────────────

DROP POLICY IF EXISTS "portfolio-photos: public read" ON storage.objects;
CREATE POLICY "portfolio-photos: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'portfolio-photos');

DROP POLICY IF EXISTS "portfolio-photos: pro upload" ON storage.objects;
CREATE POLICY "portfolio-photos: pro upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'portfolio-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "portfolio-photos: pro update" ON storage.objects;
CREATE POLICY "portfolio-photos: pro update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'portfolio-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "portfolio-photos: pro delete" ON storage.objects;
CREATE POLICY "portfolio-photos: pro delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'portfolio-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── id-photos ──────────────────────────────────────────────

DROP POLICY IF EXISTS "id-photos: pro upload" ON storage.objects;
CREATE POLICY "id-photos: pro upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'id-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "id-photos: pro update" ON storage.objects;
CREATE POLICY "id-photos: pro update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'id-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── reference-photos ───────────────────────────────────────

DROP POLICY IF EXISTS "reference-photos: customer upload" ON storage.objects;
CREATE POLICY "reference-photos: customer upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'reference-photos'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "reference-photos: authenticated read" ON storage.objects;
CREATE POLICY "reference-photos: authenticated read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'reference-photos'
    AND auth.role() = 'authenticated'
  );
