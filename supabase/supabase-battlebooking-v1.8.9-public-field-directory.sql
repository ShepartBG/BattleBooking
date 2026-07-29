-- Fix missing optional media-position columns, then create the public field directory.
-- Run in Supabase SQL Editor with "Run without RLS".

create extension if not exists pgcrypto;

alter table public.fields
  add column if not exists logo_fit text default 'contain',
  add column if not exists logo_scale numeric default 100,
  add column if not exists logo_x numeric default 50,
  add column if not exists logo_y numeric default 50,
  add column if not exists background_x numeric default 50,
  add column if not exists background_y numeric default 50;

update public.fields
set
  logo_fit = coalesce(nullif(logo_fit, ''), 'contain'),
  logo_scale = coalesce(logo_scale, 100),
  logo_x = coalesce(logo_x, 50),
  logo_y = coalesce(logo_y, 50),
  background_x = coalesce(background_x, 50),
  background_y = coalesce(background_y, 50);

drop function if exists public.get_public_field_directory();

create function public.get_public_field_directory()
returns table (
  id text,
  field_name text,
  city text,
  phone text,
  contact_phone text,
  public_slug text,
  public_region text,
  public_settlement text,
  public_location text,
  public_description text,
  logo_url text,
  logo_fit text,
  logo_scale numeric,
  logo_x numeric,
  logo_y numeric,
  background_url text,
  background_x numeric,
  background_y numeric,
  own_price text,
  rental_price text,
  facebook text,
  instagram text,
  tiktok text,
  organizer_key text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    f.id::text,
    f.field_name::text,
    f.city::text,
    f.phone::text,
    f.contact_phone::text,
    f.public_slug::text,
    f.public_region::text,
    f.public_settlement::text,
    f.public_location::text,
    f.public_description::text,
    f.logo_url::text,
    coalesce(nullif(f.logo_fit::text, ''), 'contain'),
    coalesce(f.logo_scale::numeric, 100),
    coalesce(f.logo_x::numeric, 50),
    coalesce(f.logo_y::numeric, 50),
    f.background_url::text,
    coalesce(f.background_x::numeric, 50),
    coalesce(f.background_y::numeric, 50),
    f.public_own_price::text,
    f.public_rental_price::text,
    f.facebook::text,
    f.instagram::text,
    f.tiktok::text,
    encode(
      digest(
        coalesce(f.owner_user_id::text, lower(nullif(btrim(f.owner_email), '')), f.id::text),
        'sha256'
      ),
      'hex'
    ) as organizer_key
  from public.fields f
  where coalesce(nullif(btrim(f.public_slug), ''), nullif(btrim(f.field_name), '')) is not null
  order by f.field_name asc;
$$;

revoke all on function public.get_public_field_directory() from public;
grant execute on function public.get_public_field_directory() to anon, authenticated;

notify pgrst, 'reload schema';
