-- BattleBooking v1.8.1 media + multiple-fields compatibility patch
-- Safe to run more than once.

create extension if not exists pgcrypto;

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

-- Do not require fields.active. Publication/access remains controlled by the
-- existing field_requests statuses, while extra owner fields are available publicly.

update public.fields f
set owner_email = lower(fr.email),
    public_slug = coalesce(f.public_slug, fr.public_slug),
    public_region = coalesce(f.public_region, fr.public_region),
    public_settlement = coalesce(f.public_settlement, fr.public_settlement),
    public_location = coalesce(f.public_location, fr.public_location),
    public_description = coalesce(f.public_description, fr.public_description),
    logo_url = coalesce(f.logo_url, fr.logo_url),
    background_url = coalesce(f.background_url, fr.background_url),
    public_own_price = coalesce(f.public_own_price, fr.own_price),
    public_rental_price = coalesce(f.public_rental_price, fr.rental_price),
    contact_phone = coalesce(f.contact_phone, fr.contact_phone, fr.phone),
    facebook = coalesce(f.facebook, fr.facebook),
    instagram = coalesce(f.instagram, fr.instagram),
    tiktok = coalesce(f.tiktok, fr.tiktok)
from public.field_requests fr
where fr.field_id = f.id
  and fr.email is not null;

create unique index if not exists fields_public_slug_unique
  on public.fields(public_slug)
  where public_slug is not null;
create index if not exists fields_owner_email_idx
  on public.fields(lower(owner_email));

create table if not exists public.field_images (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.fields(id) on delete cascade,
  image_url text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists field_images_field_id_idx
  on public.field_images(field_id, sort_order);

alter table public.field_images enable row level security;
drop policy if exists "Public read field images" on public.field_images;
create policy "Public read field images"
  on public.field_images for select using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'battlebooking-media',
  'battlebooking-media',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update
set public = true,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

drop policy if exists "Public view battlebooking media" on storage.objects;
create policy "Public view battlebooking media"
  on storage.objects for select
  using (bucket_id = 'battlebooking-media');

drop policy if exists "Authenticated upload battlebooking media" on storage.objects;
create policy "Authenticated upload battlebooking media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'battlebooking-media');

drop policy if exists "Authenticated delete battlebooking media" on storage.objects;
create policy "Authenticated delete battlebooking media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'battlebooking-media');
