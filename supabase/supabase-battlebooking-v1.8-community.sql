-- BattleBooking v1.8: multiple fields, galleries, partner shops and special events
create extension if not exists pgcrypto;

alter table public.fields add column if not exists owner_email text;
alter table public.fields add column if not exists public_slug text;
alter table public.fields add column if not exists public_region text;
alter table public.fields add column if not exists public_settlement text;
alter table public.fields add column if not exists public_location text;
alter table public.fields add column if not exists public_description text;
alter table public.fields add column if not exists logo_url text;
alter table public.fields add column if not exists logo_fit text default 'contain';
alter table public.fields add column if not exists logo_scale numeric default 1;
alter table public.fields add column if not exists logo_x numeric default 0;
alter table public.fields add column if not exists logo_y numeric default 0;
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
create unique index if not exists fields_public_slug_unique on public.fields(public_slug) where public_slug is not null;
create index if not exists fields_owner_email_idx on public.fields(lower(owner_email));

-- Link existing approved profiles to their existing fields.
update public.fields f
set owner_email = lower(fr.email),
    public_slug = coalesce(f.public_slug, fr.public_slug),
    public_region = coalesce(f.public_region, fr.public_region),
    public_settlement = coalesce(f.public_settlement, fr.public_settlement),
    public_location = coalesce(f.public_location, fr.public_location),
    public_description = coalesce(f.public_description, fr.public_description),
    logo_url = coalesce(f.logo_url, fr.logo_url),
    logo_fit = coalesce(f.logo_fit, fr.logo_fit),
    logo_scale = coalesce(f.logo_scale, fr.logo_scale),
    logo_x = coalesce(f.logo_x, fr.logo_x),
    logo_y = coalesce(f.logo_y, fr.logo_y),
    background_url = coalesce(f.background_url, fr.background_url),
    public_own_price = coalesce(f.public_own_price, fr.own_price),
    public_rental_price = coalesce(f.public_rental_price, fr.rental_price),
    contact_phone = coalesce(f.contact_phone, fr.contact_phone, fr.phone),
    facebook = coalesce(f.facebook, fr.facebook),
    instagram = coalesce(f.instagram, fr.instagram),
    tiktok = coalesce(f.tiktok, fr.tiktok)
from public.field_requests fr
where fr.field_id = f.id and fr.status in ('active','payment_pending','suspended');

create table if not exists public.field_images (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.fields(id) on delete cascade,
  image_url text not null,
  caption text default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists field_images_field_idx on public.field_images(field_id, sort_order);

create table if not exists public.partner_shops (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
  logo_url text, cover_url text, description text, website_url text, facebook_url text,
  instagram_url text, address text, phone text, category text, promo_code text,
  featured boolean not null default false, status text not null default 'active',
  sort_order integer not null default 0, paid_until date, created_at timestamptz not null default now()
);

create table if not exists public.special_events (
  id uuid primary key default gen_random_uuid(), title text not null, slug text not null unique,
  cover_url text, short_description text, description text, event_type text,
  country text default 'България', city text, location text, start_date date, end_date date,
  website_url text, registration_url text, facebook_url text, organizer_name text,
  price_text text, featured boolean not null default false, status text not null default 'active',
  created_at timestamptz not null default now()
);

alter table public.field_images enable row level security;
alter table public.partner_shops enable row level security;
alter table public.special_events enable row level security;

drop policy if exists "Public read field images" on public.field_images;
create policy "Public read field images" on public.field_images for select using (true);
drop policy if exists "Public read active shops" on public.partner_shops;
create policy "Public read active shops" on public.partner_shops for select using (status = 'active');
drop policy if exists "Public read active events" on public.special_events;
create policy "Public read active events" on public.special_events for select using (status = 'active');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('battlebooking-media','battlebooking-media',true,10485760,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public=true, file_size_limit=10485760, allowed_mime_types=array['image/jpeg','image/png','image/webp','image/gif'];

drop policy if exists "Public view battlebooking media" on storage.objects;
create policy "Public view battlebooking media" on storage.objects for select using (bucket_id='battlebooking-media');
drop policy if exists "Authenticated upload battlebooking media" on storage.objects;
create policy "Authenticated upload battlebooking media" on storage.objects for insert to authenticated with check (bucket_id='battlebooking-media');
drop policy if exists "Authenticated delete battlebooking media" on storage.objects;
create policy "Authenticated delete battlebooking media" on storage.objects for delete to authenticated using (bucket_id='battlebooking-media');


-- Multi-field RLS additions. Existing policies remain in place; these only grant access to fields owned by the logged-in email.
alter table public.fields enable row level security;
drop policy if exists "Organizers read owned fields v18" on public.fields;
create policy "Organizers read owned fields v18" on public.fields for select to authenticated
using (lower(owner_email) = lower(coalesce(auth.jwt() ->> 'email','')));
drop policy if exists "Organizers update owned fields v18" on public.fields;
create policy "Organizers update owned fields v18" on public.fields for update to authenticated
using (lower(owner_email) = lower(coalesce(auth.jwt() ->> 'email','')))
with check (lower(owner_email) = lower(coalesce(auth.jwt() ->> 'email','')));

drop policy if exists "Organizers insert games for owned fields v18" on public.games;
create policy "Organizers insert games for owned fields v18" on public.games for insert to authenticated
with check (exists (select 1 from public.fields f where f.id = games.field_id and lower(f.owner_email)=lower(coalesce(auth.jwt() ->> 'email',''))));
drop policy if exists "Organizers read games for owned fields v18" on public.games;
create policy "Organizers read games for owned fields v18" on public.games for select to authenticated
using (exists (select 1 from public.fields f where f.id = games.field_id and lower(f.owner_email)=lower(coalesce(auth.jwt() ->> 'email',''))));
drop policy if exists "Organizers update games for owned fields v18" on public.games;
create policy "Organizers update games for owned fields v18" on public.games for update to authenticated
using (exists (select 1 from public.fields f where f.id = games.field_id and lower(f.owner_email)=lower(coalesce(auth.jwt() ->> 'email',''))))
with check (exists (select 1 from public.fields f where f.id = games.field_id and lower(f.owner_email)=lower(coalesce(auth.jwt() ->> 'email',''))));
drop policy if exists "Organizers delete games for owned fields v18" on public.games;
create policy "Organizers delete games for owned fields v18" on public.games for delete to authenticated
using (exists (select 1 from public.fields f where f.id = games.field_id and lower(f.owner_email)=lower(coalesce(auth.jwt() ->> 'email',''))));
