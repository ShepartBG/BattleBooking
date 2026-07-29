-- BattleBooking v1.8.4 - partner shops, special events and image uploads
-- Run the complete file in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.partner_shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  cover_url text,
  description text,
  website_url text,
  facebook_url text,
  instagram_url text,
  address text,
  phone text,
  category text,
  promo_code text,
  featured boolean not null default false,
  status text not null default 'active',
  sort_order integer not null default 0,
  paid_until date,
  created_at timestamptz not null default now()
);

create table if not exists public.special_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  cover_url text,
  short_description text,
  description text,
  event_type text,
  country text default 'България',
  city text,
  location text,
  start_date date,
  end_date date,
  website_url text,
  registration_url text,
  facebook_url text,
  organizer_name text,
  price_text text,
  featured boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create index if not exists partner_shops_status_idx on public.partner_shops(status, featured, sort_order);
create index if not exists special_events_status_idx on public.special_events(status, featured, start_date);

alter table public.partner_shops enable row level security;
alter table public.special_events enable row level security;

drop policy if exists "Public read active shops" on public.partner_shops;
create policy "Public read active shops"
on public.partner_shops for select
to anon, authenticated
using (status = 'active');

drop policy if exists "Public read active events" on public.special_events;
create policy "Public read active events"
on public.special_events for select
to anon, authenticated
using (status = 'active');

grant select on public.partner_shops to anon, authenticated;
grant select on public.special_events to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'battlebooking-media',
  'battlebooking-media',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public view battlebooking media" on storage.objects;
create policy "Public view battlebooking media"
on storage.objects for select
to public
using (bucket_id = 'battlebooking-media');

-- Force PostgREST to refresh its schema cache immediately.
notify pgrst, 'reload schema';
