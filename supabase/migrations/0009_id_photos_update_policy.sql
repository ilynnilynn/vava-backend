-- ============================================================
-- MIGRATION 0009 — id-photos: add UPDATE policy for upsert
--
-- The onboarding page uploads ID photos with { upsert: true },
-- which requires both INSERT and UPDATE policies on storage.objects.
-- Migration 0006 only created an INSERT policy.
-- ============================================================

create policy "id-photos: pro update"
  on storage.objects for update
  using (
    bucket_id = 'id-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
