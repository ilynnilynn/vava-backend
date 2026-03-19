-- ============================================================
-- VAVA — Initial Schema
-- Migration: 0001_initial_schema
-- Run via: supabase db push
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Enums ────────────────────────────────────────────────────

create type booking_status as enum (
  'confirmed',
  'reschedule_pending',
  'rescheduled',
  'cancelled_grace',
  'cancelled_customer',
  'cancelled_pro',
  'completed',
  'no_show_customer',
  'no_show_pro',
  'expired'
);

create type flag_type as enum ('soft', 'hard', 'no_show');

create type flagged_entity as enum ('customer', 'pro');

create type pro_standing as enum ('good', 'warning', 'at_risk', 'suspended');

create type subscription_status as enum ('free', 'active', 'read_only');

create type lash_density as enum ('light', 'daily', 'heavy');

create type nail_scope as enum ('both_hands', 'single_hand', 'repair');

create type treatment_tier as enum ('basic', 'standard', 'premium');

create type cancellation_actor as enum ('customer', 'pro');

create type domain_type as enum ('nails', 'lashes');

-- ── 1. users ─────────────────────────────────────────────────
-- Extends Supabase auth.users. Inserted on first login.

create table users (
  id                uuid primary key references auth.users(id) on delete cascade,
  display_name      text,
  phone             text,
  line_user_id      text unique,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── 2. pros ──────────────────────────────────────────────────

create table pros (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  display_name          text not null,
  bio                   text,
  phone                 text,
  line_user_id          text unique,
  studio_address        text,
  studio_district       text,
  portfolio_urls        text[],
  is_approved           boolean not null default false,
  is_suspended          boolean not null default false,
  standing              pro_standing not null default 'good',
  subscription_status   subscription_status not null default 'free',
  subscription_expires_at timestamptz,
  no_show_window_minutes integer not null default 15,   -- 10 | 15 | 20
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (user_id)
);

-- ── 3. service_categories ────────────────────────────────────

create table service_categories (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  name_zh     text,
  domain      domain_type not null,
  sort_order  integer not null default 0,
  is_enabled  boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ── 4. service_style_modifiers ───────────────────────────────

create table service_style_modifiers (
  id          uuid primary key default uuid_generate_v4(),
  key         text not null unique,
  label       text not null,
  label_zh    text,
  domain      domain_type not null,
  is_package  boolean not null default false,
  sort_order  integer not null default 0,
  is_enabled  boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ── 5. pro_services ──────────────────────────────────────────
-- One row per (pro × category × style modifier).
-- Lash fill-in prices stored as four nullable fields.

create table pro_services (
  id                      uuid primary key default uuid_generate_v4(),
  pro_id                  uuid not null references pros(id) on delete cascade,
  category_id             uuid not null references service_categories(id),
  style_id                uuid references service_style_modifiers(id),
  price_ntd               integer not null default 0,
  duration_minutes        integer not null default 60,
  -- Lash density deltas (added to base price_ntd)
  density_light_delta     integer,
  density_daily_delta     integer,
  density_heavy_delta     integer,
  -- Fill-in prices (補睫) — same_shop = returning customer
  same_shop_14_price      integer,
  same_shop_21_price      integer,
  outside_shop_14_price   integer,
  outside_shop_21_price   integer,
  is_enabled              boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ── 6. pro_nail_packages ─────────────────────────────────────

create table pro_nail_packages (
  id              uuid primary key default uuid_generate_v4(),
  pro_id          uuid not null references pros(id) on delete cascade,
  name            text not null,
  description     text,
  price_ntd       integer not null,
  duration_minutes integer not null default 90,
  includes_gel    boolean not null default true,
  is_enabled      boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── 7. slots ─────────────────────────────────────────────────
-- 15-minute increments, 72-hour window.
-- is_booked: locked by confirmBooking(), freed by cancelBooking()
-- is_expired: set by cron when starts_at has passed

create table slots (
  id          uuid primary key default uuid_generate_v4(),
  pro_id      uuid not null references pros(id) on delete cascade,
  starts_at   timestamptz not null,
  is_booked   boolean not null default false,
  is_expired  boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (pro_id, starts_at)
);

-- ── 8. bookings ──────────────────────────────────────────────

create table bookings (
  id                        uuid primary key default uuid_generate_v4(),
  user_id                   uuid not null references users(id),
  pro_id                    uuid not null references pros(id),
  slot_id                   uuid not null references slots(id),
  -- Service selection
  service_category_ids      uuid[] not null,
  style_id                  uuid references service_style_modifiers(id),
  -- Lash-specific
  lash_density              lash_density,
  lash_special_fiber_tag_id uuid,
  lash_style_tags           text[],
  -- Nail-specific
  addon_ids                 uuid[],
  nail_scope                nail_scope,
  treatment_tier            treatment_tier,
  nail_package_id           uuid references pro_nail_packages(id),
  -- Fill-in
  fill_in_days              integer,
  is_returning_customer     boolean,
  -- Pricing snapshot
  price_min                 integer not null,
  price_max                 integer not null,
  -- Preferences + note
  preference                text[],
  customer_note             text,
  briefing_ref_photo_url    text,
  -- Timing
  starts_at                 timestamptz,
  session_ends_at           timestamptz,
  no_show_window_minutes    integer not null default 15,
  -- Status
  status                    booking_status not null default 'confirmed',
  cancelled_at              timestamptz,
  cancellation_actor        cancellation_actor,
  completed_at              timestamptz,
  early_completion          boolean not null default false,
  no_show_reported_at       timestamptz,
  no_show_reporter          text,
  -- Reminders
  reminder_sent_at          timestamptz,
  rating_prompt_sent_at     timestamptz,
  -- Timestamps
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- ── 9. flags ─────────────────────────────────────────────────
-- Written after cancellations and no-shows.
-- Standing is COMPUTED from flags via computeStanding() — never stored directly
-- (pros.standing is a cache only, always re-derived from this table).

create table flags (
  id              uuid primary key default uuid_generate_v4(),
  booking_id      uuid not null references bookings(id),
  flagged_entity  flagged_entity not null,
  flagged_id      uuid not null,   -- user_id or pro_id
  flag_type       flag_type not null,
  is_same_day     boolean not null default false,
  note            text,
  created_at      timestamptz not null default now()
);

-- ── 10. lash_special_fiber_tags ──────────────────────────────
-- Master list of special fiber types (e.g. 貂毛, 人毛).
-- Managed by VAVA admin.

create table lash_special_fiber_tags (
  id          uuid primary key default uuid_generate_v4(),
  key         text not null unique,
  label       text not null,
  label_zh    text,
  sort_order  integer not null default 0,
  is_enabled  boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ── 11. pro_special_fiber_prices ─────────────────────────────
-- Pro's price for each special fiber type.
-- base price_ntd + density delta.

create table pro_special_fiber_prices (
  id                    uuid primary key default uuid_generate_v4(),
  pro_id                uuid not null references pros(id) on delete cascade,
  tag_id                uuid not null references lash_special_fiber_tags(id),
  price_ntd             integer not null,
  density_light_delta   integer,
  density_daily_delta   integer,
  density_heavy_delta   integer,
  is_enabled            boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (pro_id, tag_id)
);

-- ── 12. ratings ──────────────────────────────────────────────
-- One per booking. Written by customer 1hr after completed_at.

create table ratings (
  id          uuid primary key default uuid_generate_v4(),
  booking_id  uuid not null references bookings(id) unique,
  user_id     uuid not null references users(id),
  pro_id      uuid not null references pros(id),
  score       integer not null check (score between 1 and 5),
  note        text,
  created_at  timestamptz not null default now()
);

-- ── Indexes ──────────────────────────────────────────────────

create index on slots (pro_id, starts_at) where is_expired = false;
create index on slots (starts_at) where is_booked = false and is_expired = false;
create index on bookings (user_id);
create index on bookings (pro_id, starts_at);
create index on bookings (status);
create index on bookings (session_ends_at) where status = 'confirmed';
create index on flags (flagged_id);
create index on ratings (pro_id);

-- ── Row Level Security ───────────────────────────────────────

alter table users                   enable row level security;
alter table pros                    enable row level security;
alter table service_categories      enable row level security;
alter table service_style_modifiers enable row level security;
alter table pro_services            enable row level security;
alter table pro_nail_packages       enable row level security;
alter table slots                   enable row level security;
alter table bookings                enable row level security;
alter table flags                   enable row level security;
alter table lash_special_fiber_tags enable row level security;
alter table pro_special_fiber_prices enable row level security;
alter table ratings                 enable row level security;

-- users: own row only
create policy "users: own row" on users
  for all using (auth.uid() = id);

-- pros: own row for write; any authenticated read
create policy "pros: read all" on pros
  for select using (auth.role() = 'authenticated');
create policy "pros: own write" on pros
  for all using (auth.uid() = user_id);

-- service_categories: public read (used in search)
create policy "service_categories: public read" on service_categories
  for select using (true);

-- service_style_modifiers: public read
create policy "service_style_modifiers: public read" on service_style_modifiers
  for select using (true);

-- pro_services: public read; pro owns write
create policy "pro_services: public read" on pro_services
  for select using (true);
create policy "pro_services: pro write" on pro_services
  for all using (
    auth.uid() = (select user_id from pros where id = pro_id limit 1)
  );

-- pro_nail_packages: public read; pro owns write
create policy "pro_nail_packages: public read" on pro_nail_packages
  for select using (true);
create policy "pro_nail_packages: pro write" on pro_nail_packages
  for all using (
    auth.uid() = (select user_id from pros where id = pro_id limit 1)
  );

-- slots: public read; pro owns write
create policy "slots: public read" on slots
  for select using (true);
create policy "slots: pro write" on slots
  for all using (
    auth.uid() = (select user_id from pros where id = pro_id limit 1)
  );

-- bookings: customer sees own; pro sees own; service role sees all
create policy "bookings: customer read own" on bookings
  for select using (auth.uid() = user_id);
create policy "bookings: pro read own" on bookings
  for select using (
    auth.uid() = (select user_id from pros where id = pro_id limit 1)
  );
create policy "bookings: customer insert" on bookings
  for insert with check (auth.uid() = user_id);
create policy "bookings: customer update own" on bookings
  for update using (auth.uid() = user_id);
create policy "bookings: pro update own" on bookings
  for update using (
    auth.uid() = (select user_id from pros where id = pro_id limit 1)
  );

-- flags: service role only (written by server-side lib/flags.ts)
-- No direct client access to flags table.

-- lash_special_fiber_tags: public read
create policy "lash_special_fiber_tags: public read" on lash_special_fiber_tags
  for select using (true);

-- pro_special_fiber_prices: public read; pro owns write
create policy "pro_special_fiber_prices: public read" on pro_special_fiber_prices
  for select using (true);
create policy "pro_special_fiber_prices: pro write" on pro_special_fiber_prices
  for all using (
    auth.uid() = (select user_id from pros where id = pro_id limit 1)
  );

-- ratings: public read; customer inserts own
create policy "ratings: public read" on ratings
  for select using (true);
create policy "ratings: customer insert" on ratings
  for insert with check (auth.uid() = user_id);
