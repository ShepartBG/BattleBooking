-- BattleBooking v1.8.2 REQUIRED DATABASE SCHEMA
-- Run this entire file once in Supabase SQL Editor before testing Fields/Gallery.

alter table public.fields add column if not exists owner_email text;
alter table public.fields add column if not exists public_slug text;
alter table public.fields add column if not exists public_region text;
alter table public.fields add column if not exists public_settlement text;
alter table public.fields add column if not exists public_location text;
alter table public.fields add column if not exists public_description text;
alter table public.fields add column if not exists logo_url text;
alter table public.fields add column if not exists background_url text;
alter table public.fields add column if not exists public_own_price text;
alter table public.fields add column if not exists public_rental_price text;
alter table public.fields add column if not exists contact_phone text;
alter table public.fields add column if not exists facebook text;
alter table public.fields add column if not exists instagram text;
alter table public.fields add column if not exists tiktok text;
alter table public.fields add column if not exists default_max_rental_sets integer default 0;
alter table public.fields add column if not exists default_rules_text text;
alter table public.fields add column if not exists default_game_description text;
alter table public.fields add column if not exists created_at timestamptz not null default now();

-- Connect all existing approved profiles to their owner without changing field IDs.
update public.fields f
set owner_email = lower(fr.email)
from public.field_requests fr
where fr.field_id = f.id
  and fr.email is not null
  and (f.owner_email is null or btrim(f.owner_email) = '');

create table if not exists public.field_images (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.fields(id) on delete cascade,
  image_url text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists field_images_field_id_idx
  on public.field_images(field_id, sort_order, created_at);

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

-- The API uploads with the service role; public read is needed for profile images.
drop policy if exists "Public read battlebooking media" on storage.objects;
create policy "Public read battlebooking media"
on storage.objects for select
to public
using (bucket_id = 'battlebooking-media');

-- Force PostgREST to see the newly added columns immediately.
notify pgrst, 'reload schema';
