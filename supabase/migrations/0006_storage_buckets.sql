-- ============================================================
-- VAVA — Storage Buckets + RLS Policies
-- Migration: 0002_storage_buckets
--
-- Buckets:
--   portfolio-photos  — public read, pro write (portfolio images)
--   id-photos         — private, no public URL (identity verification)
--   reference-photos  — private, customer + pro read (booking ref photos)
-- ============================================================

-- ── Create buckets ──────────────────────────────────────────

insert into storage.buckets (id, name, public)
values
  ('portfolio-photos', 'portfolio-photos', true),
  ('id-photos', 'id-photos', false),
  ('reference-photos', 'reference-photos', false)
on conflict (id) do nothing;

-- ── portfolio-photos: public read, pro write ────────────────

-- Anyone can view portfolio photos (used in search results / pro profile)
create policy "portfolio-photos: public read"
  on storage.objects for select
  using (bucket_id = 'portfolio-photos');

-- Pros can upload/update/delete their own portfolio photos
-- Path convention: portfolio-photos/{pro_user_id}/{filename}
create policy "portfolio-photos: pro upload"
  on storage.objects for insert
  with check (
    bucket_id = 'portfolio-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "portfolio-photos: pro update"
  on storage.objects for update
  using (
    bucket_id = 'portfolio-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "portfolio-photos: pro delete"
  on storage.objects for delete
  using (
    bucket_id = 'portfolio-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── id-photos: private, service role only ───────────────────
-- No public access. Pros upload during onboarding, admin reads via service role.
-- Path convention: id-photos/{pro_user_id}/{filename}

-- Pros can upload their own ID photos
create policy "id-photos: pro upload"
  on storage.objects for insert
  with check (
    bucket_id = 'id-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- No select policy for regular users — admin uses service role key to read

-- ── reference-photos: customer upload, customer + pro read ──
-- Path convention: reference-photos/{booking_id}/{filename}

-- Customers can upload reference photos for their bookings
create policy "reference-photos: customer upload"
  on storage.objects for insert
  with check (
    bucket_id = 'reference-photos'
    and auth.role() = 'authenticated'
  );

-- Authenticated users can read reference photos
-- (Fine-grained per-booking access enforced at app layer via booking ownership)
create policy "reference-photos: authenticated read"
  on storage.objects for select
  using (
    bucket_id = 'reference-photos'
    and auth.role() = 'authenticated'
  );
