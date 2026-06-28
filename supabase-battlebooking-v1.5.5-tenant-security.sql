-- BattleBooking v1.5.5 Emergency Tenant Security Fix
-- Пуска се в Supabase SQL Editor преди deploy.
-- Цел: игрите вече са вързани към конкретен профил/терен от field_requests.

alter table public.games
add column if not exists field_request_id uuid references public.field_requests(id) on delete cascade;

create index if not exists games_field_request_id_idx on public.games(field_request_id);
create index if not exists games_field_request_status_date_idx on public.games(field_request_id, status, game_date);

-- ВАЖНО ЗА СТАРИТЕ ИГРИ:
-- В момента съществуващата Warzone игра вероятно няма field_request_id.
-- Намери id-то на Warzone профила:
-- select id, email, field_name, status from public.field_requests order by created_at desc;
-- После вържи старата игра към правилния терен:
-- update public.games
-- set field_request_id = 'WARZONE_FIELD_REQUEST_ID_HERE'
-- where id = 'WARZONE_GAME_ID_HERE';

-- За да не излиза чужда/стара игра в профилите, кодът вече показва само игри със съвпадащ field_request_id.
