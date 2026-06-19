-- Bug reports table + storage bucket

create table public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  flow text not null,
  description text not null,
  screenshot_path text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.bug_reports enable row level security;

create policy "bug_reports: user insert"
  on public.bug_reports for insert
  with check (auth.uid() = user_id);

create policy "bug_reports: user select"
  on public.bug_reports for select
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('bug-screenshots', 'bug-screenshots', false)
on conflict (id) do nothing;

create policy "bug-screenshots: user upload"
  on storage.objects for insert
  with check (
    bucket_id = 'bug-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
