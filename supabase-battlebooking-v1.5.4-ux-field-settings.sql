-- BattleBooking v1.5.4
-- Public field profile settings saved in Supabase, not only localStorage.

alter table public.field_requests
add column if not exists public_slug text,
add column if not exists public_region text,
add column if not exists public_settlement text,
add column if not exists public_location text,
add column if not exists public_description text,
add column if not exists logo_url text,
add column if not exists logo_fit text default 'contain',
add column if not exists logo_scale numeric default 1,
add column if not exists logo_x numeric default 0,
add column if not exists logo_y numeric default 0,
add column if not exists background_url text,
add column if not exists own_price text,
add column if not exists rental_price text,
add column if not exists contact_phone text,
add column if not exists tiktok text;

update public.field_requests
set
  public_slug = coalesce(public_slug, lower(regexp_replace(field_name, '[^a-zA-Z0-9а-яА-ЯёЁ]+', '-', 'g'))),
  public_settlement = coalesce(public_settlement, city),
  public_location = coalesce(public_location, city),
  public_description = coalesce(public_description, message),
  contact_phone = coalesce(contact_phone, phone),
  logo_url = coalesce(logo_url, '/battlebooking-real-logo-transparent.png'),
  background_url = coalesce(background_url, '/battlebooking-bg.jpg'),
  logo_fit = coalesce(logo_fit, 'contain'),
  logo_scale = coalesce(logo_scale, 1),
  logo_x = coalesce(logo_x, 0),
  logo_y = coalesce(logo_y, 0)
where status in ('active', 'payment_pending', 'suspended');
