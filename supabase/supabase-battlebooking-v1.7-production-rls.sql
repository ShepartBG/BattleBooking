-- BattleBooking v1.7 — Production RLS hardening
-- Run once in Supabase SQL Editor as postgres.
-- This migration removes the old permissive policies and replaces them with
-- policies matching the current BattleBooking ownership model:
-- auth email -> field_requests.email -> field_requests.field_id -> games.field_id.

begin;

-- ---------------------------------------------------------------------------
-- 1. Helper functions used by policies
-- ---------------------------------------------------------------------------

create or replace function public.bb_current_email()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.bb_is_owner()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.bb_current_email() in (
    'battlebooking@abv.bg',
    'battlebooking.bg@gmail.com'
  );
$$;

create or replace function public.bb_has_active_access()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.bb_is_owner() or exists (
    select 1
    from public.field_requests fr
    where lower(fr.email) = public.bb_current_email()
      and coalesce(fr.access_status, fr.status) = 'active'
      and (fr.grace_until is null or fr.grace_until >= current_date)
  );
$$;

create or replace function public.bb_owns_field(target_field_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.bb_is_owner() or exists (
    select 1
    from public.field_requests fr
    where fr.field_id = target_field_id
      and lower(fr.email) = public.bb_current_email()
      and coalesce(fr.access_status, fr.status) in ('active', 'payment_pending', 'suspended')
  );
$$;

create or replace function public.bb_owns_game(target_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.bb_is_owner() or exists (
    select 1
    from public.games g
    where g.id = target_game_id
      and public.bb_owns_field(g.field_id)
  );
$$;

revoke all on function public.bb_current_email() from public;
revoke all on function public.bb_is_owner() from public;
revoke all on function public.bb_has_active_access() from public;
revoke all on function public.bb_owns_field(uuid) from public;
revoke all on function public.bb_owns_game(uuid) from public;

grant execute on function public.bb_current_email() to anon, authenticated, service_role;
grant execute on function public.bb_is_owner() to anon, authenticated, service_role;
grant execute on function public.bb_has_active_access() to authenticated, service_role;
grant execute on function public.bb_owns_field(uuid) to authenticated, service_role;
grant execute on function public.bb_owns_game(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Remove every previous policy on the application tables
-- ---------------------------------------------------------------------------

do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'field_requests', 'fields', 'games', 'organizations',
        'organizers', 'profiles', 'registrations'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Enable RLS
-- ---------------------------------------------------------------------------

alter table public.field_requests enable row level security;
alter table public.fields enable row level security;
alter table public.games enable row level security;
alter table public.organizations enable row level security;
alter table public.organizers enable row level security;
alter table public.profiles enable row level security;
alter table public.registrations enable row level security;

-- ---------------------------------------------------------------------------
-- 4. field_requests
-- Public submissions now go through /api/field-requests using service_role.
-- ---------------------------------------------------------------------------

create policy "field_requests owner read all"
on public.field_requests
for select
to authenticated
using (public.bb_is_owner());

create policy "field_requests organizer read own"
on public.field_requests
for select
to authenticated
using (lower(email) = public.bb_current_email());

create policy "field_requests owner update all"
on public.field_requests
for update
to authenticated
using (public.bb_is_owner())
with check (public.bb_is_owner());

create policy "field_requests organizer update own"
on public.field_requests
for update
to authenticated
using (lower(email) = public.bb_current_email())
with check (lower(email) = public.bb_current_email());

create policy "field_requests owner delete all"
on public.field_requests
for delete
to authenticated
using (public.bb_is_owner());

-- ---------------------------------------------------------------------------
-- 5. fields
-- ---------------------------------------------------------------------------

create policy "fields owner read all"
on public.fields
for select
to authenticated
using (public.bb_is_owner());

create policy "fields organizer read own"
on public.fields
for select
to authenticated
using (public.bb_owns_field(id));

-- Needed only while a newly approved organizer is being linked to a real field.
create policy "fields organizer create during setup"
on public.fields
for insert
to authenticated
with check (public.bb_has_active_access());

create policy "fields owner update all"
on public.fields
for update
to authenticated
using (public.bb_is_owner())
with check (public.bb_is_owner());

create policy "fields organizer update own"
on public.fields
for update
to authenticated
using (public.bb_owns_field(id))
with check (public.bb_owns_field(id));

create policy "fields owner delete all"
on public.fields
for delete
to authenticated
using (public.bb_is_owner());

-- ---------------------------------------------------------------------------
-- 6. games
-- ---------------------------------------------------------------------------

create policy "games public read visible"
on public.games
for select
to anon, authenticated
using (
  status in ('active', 'postponed')
  and game_date >= (current_date - 1)
);

create policy "games owner read all"
on public.games
for select
to authenticated
using (public.bb_is_owner());

create policy "games organizer read own"
on public.games
for select
to authenticated
using (public.bb_owns_field(field_id));

create policy "games owner create all"
on public.games
for insert
to authenticated
with check (public.bb_is_owner());

create policy "games organizer create own"
on public.games
for insert
to authenticated
with check (public.bb_owns_field(field_id));

create policy "games owner update all"
on public.games
for update
to authenticated
using (public.bb_is_owner())
with check (public.bb_is_owner());

create policy "games organizer update own"
on public.games
for update
to authenticated
using (public.bb_owns_field(field_id))
with check (public.bb_owns_field(field_id));

create policy "games owner delete all"
on public.games
for delete
to authenticated
using (public.bb_is_owner());

create policy "games organizer delete own"
on public.games
for delete
to authenticated
using (public.bb_owns_field(field_id));

-- ---------------------------------------------------------------------------
-- 7. registrations (contains personal data — never public SELECT)
-- Public create/stats use server routes with service_role.
-- ---------------------------------------------------------------------------

create policy "registrations owner read all"
on public.registrations
for select
to authenticated
using (public.bb_is_owner());

create policy "registrations organizer read own games"
on public.registrations
for select
to authenticated
using (public.bb_owns_game(game_id));

create policy "registrations owner update all"
on public.registrations
for update
to authenticated
using (public.bb_is_owner())
with check (public.bb_is_owner());

create policy "registrations organizer update own games"
on public.registrations
for update
to authenticated
using (public.bb_owns_game(game_id))
with check (public.bb_owns_game(game_id));

create policy "registrations owner delete all"
on public.registrations
for delete
to authenticated
using (public.bb_is_owner());

create policy "registrations organizer delete own games"
on public.registrations
for delete
to authenticated
using (public.bb_owns_game(game_id));

-- ---------------------------------------------------------------------------
-- 8. profiles
-- profiles.id is expected to match auth.users.id.
-- ---------------------------------------------------------------------------

create policy "profiles read own"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.bb_is_owner());

create policy "profiles create own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid() or public.bb_is_owner());

create policy "profiles update own"
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.bb_is_owner())
with check (id = auth.uid() or public.bb_is_owner());

create policy "profiles owner delete"
on public.profiles
for delete
to authenticated
using (public.bb_is_owner());

-- ---------------------------------------------------------------------------
-- 9. organizations
-- ---------------------------------------------------------------------------

create policy "organizations public read"
on public.organizations
for select
to anon, authenticated
using (true);

create policy "organizations owner create"
on public.organizations
for insert
to authenticated
with check (public.bb_is_owner());

create policy "organizations owner update all"
on public.organizations
for update
to authenticated
using (public.bb_is_owner())
with check (public.bb_is_owner());

create policy "organizations member update own"
on public.organizations
for update
to authenticated
using (
  id in (select p.organization_id from public.profiles p where p.id = auth.uid())
)
with check (
  id in (select p.organization_id from public.profiles p where p.id = auth.uid())
);

create policy "organizations owner delete"
on public.organizations
for delete
to authenticated
using (public.bb_is_owner());

-- ---------------------------------------------------------------------------
-- 10. organizers
-- ---------------------------------------------------------------------------

create policy "organizers read own"
on public.organizers
for select
to authenticated
using (lower(email) = public.bb_current_email() or public.bb_is_owner());

create policy "organizers owner create"
on public.organizers
for insert
to authenticated
with check (public.bb_is_owner());

create policy "organizers update own"
on public.organizers
for update
to authenticated
using (lower(email) = public.bb_current_email() or public.bb_is_owner())
with check (lower(email) = public.bb_current_email() or public.bb_is_owner());

create policy "organizers owner delete"
on public.organizers
for delete
to authenticated
using (public.bb_is_owner());

commit;

-- Verification query:
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  count(p.policyname) as policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p
  on p.schemaname = n.nspname
 and p.tablename = c.relname
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'field_requests', 'fields', 'games', 'organizations',
    'organizers', 'profiles', 'registrations', 'rate_limit_events'
  )
group by c.relname, c.relrowsecurity
order by c.relname;
