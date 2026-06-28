-- BattleBooking v1.6.3 - deterministic link between field_requests and fields
-- Safe to run more than once.

alter table public.field_requests
add column if not exists field_id uuid references public.fields(id) on delete set null;

-- Link Warzone request to the already existing Warzone field.
-- These are the IDs visible in your Supabase screenshots.
update public.field_requests
set field_id = 'e825a6e5-0d6a-4dfa-bca0-029318d1418e'
where lower(email) = lower('airsoft.field.warzone@abv.bg')
  and field_id is null;

-- For any other existing active requests, link by exact same field name + city + phone.
update public.field_requests fr
set field_id = f.id
from public.fields f
where fr.field_id is null
  and fr.field_name = f.field_name
  and coalesce(fr.city, '') = coalesce(f.city, '')
  and coalesce(fr.phone, '') = coalesce(f.phone, '');

-- Keep games open for live test if RLS was accidentally enabled earlier.
alter table public.games disable row level security;
alter table public.fields disable row level security;
alter table public.field_requests disable row level security;
