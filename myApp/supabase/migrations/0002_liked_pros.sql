-- supabase/migrations/0002_liked_pros.sql
create table liked_pros (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  pro_id      uuid not null references pros(id) on delete cascade,
  created_at  timestamptz default now(),
  unique(customer_id, pro_id)
);

alter table liked_pros enable row level security;

create policy "customers can manage own likes"
  on liked_pros for all
  using  (auth.uid() = customer_id)
  with check (auth.uid() = customer_id);
