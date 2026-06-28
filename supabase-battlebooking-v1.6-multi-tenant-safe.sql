-- BattleBooking v1.6 Multi-Tenant Safe SQL
-- Пусни целия файл в Supabase SQL Editor.
-- Безопасен е за повторно пускане: използва IF NOT EXISTS / DROP POLICY IF EXISTS.

-- 1) Всяка игра трябва да принадлежи на конкретно игрище/организатор.
alter table public.games
add column if not exists field_id uuid references public.field_requests(id) on delete cascade;

create index if not exists games_field_id_idx on public.games(field_id);
create index if not exists games_field_id_status_date_idx on public.games(field_id, status, game_date);

-- 2) ВАЖНО: ако вече имаш стара Warzone игра без field_id,
-- сложи нейния field_id ръчно с този шаблон:
-- update public.games
-- set field_id = 'ID_NA_WARZONE_FIELD_REQUEST'
-- where id = 'ID_NA_WARZONE_GAME';
--
-- ID_NA_WARZONE_FIELD_REQUEST може да намериш с:
-- select id, field_name, email, status from public.field_requests order by created_at desc;
--
-- След като го свържем, Graveyard няма да вижда тази игра.

-- 3) RLS за games. Ако при теб вече има политики от стария SQL,
-- ги махаме и създаваме правилни по field_requests.email = auth.email().
alter table public.games enable row level security;

drop policy if exists "games_select_own_field" on public.games;
drop policy if exists "games_insert_own_field" on public.games;
drop policy if exists "games_update_own_field" on public.games;
drop policy if exists "games_delete_own_field" on public.games;
drop policy if exists "BattleBooking games select by field owner" on public.games;
drop policy if exists "BattleBooking games insert by field owner" on public.games;
drop policy if exists "BattleBooking games update by field owner" on public.games;
drop policy if exists "BattleBooking games delete by field owner" on public.games;
drop policy if exists "BattleBooking games public upcoming" on public.games;

-- Public може да вижда само бъдещи активни/отложени игри, за да работят /games и /field/[slug].
create policy "BattleBooking games public upcoming"
on public.games
for select
using (
  status in ('active', 'postponed')
  and game_date >= current_date
);

-- Логнат организатор вижда само игрите на своя field_request email.
create policy "BattleBooking games select by field owner"
on public.games
for select
to authenticated
using (
  exists (
    select 1
    from public.field_requests fr
    where fr.id = games.field_id
      and lower(fr.email) = lower(auth.email())
  )
);

create policy "BattleBooking games insert by field owner"
on public.games
for insert
to authenticated
with check (
  exists (
    select 1
    from public.field_requests fr
    where fr.id = games.field_id
      and lower(fr.email) = lower(auth.email())
  )
);

create policy "BattleBooking games update by field owner"
on public.games
for update
to authenticated
using (
  exists (
    select 1
    from public.field_requests fr
    where fr.id = games.field_id
      and lower(fr.email) = lower(auth.email())
  )
)
with check (
  exists (
    select 1
    from public.field_requests fr
    where fr.id = games.field_id
      and lower(fr.email) = lower(auth.email())
  )
);

create policy "BattleBooking games delete by field owner"
on public.games
for delete
to authenticated
using (
  exists (
    select 1
    from public.field_requests fr
    where fr.id = games.field_id
      and lower(fr.email) = lower(auth.email())
  )
);
