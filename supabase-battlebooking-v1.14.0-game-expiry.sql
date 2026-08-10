-- BattleBooking v1.14.0
-- Enforce the public game lifetime at DB level: game start + 4 hours, Europe/Sofia.

begin;

create or replace function public.bb_close_expired_games()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer := 0;
begin
  update public.games
  set status = 'closed'
  where status in ('active', 'postponed')
    and (
      game_date::date
      + coalesce(nullif(left(game_time::text, 5), '')::time, time '23:59')
      + interval '4 hours'
    ) < timezone('Europe/Sofia', now());

  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.bb_close_expired_games() from public;
grant execute on function public.bb_close_expired_games() to service_role;

-- Public reads are also restricted by the same 4-hour rule.
drop policy if exists "games public read visible" on public.games;
create policy "games public read visible"
on public.games
for select
to anon, authenticated
using (
  status in ('active', 'postponed')
  and (
    game_date::date
    + coalesce(nullif(left(game_time::text, 5), '')::time, time '23:59')
    + interval '4 hours'
  ) >= timezone('Europe/Sofia', now())
);

commit;
