-- BattleBooking v1.1 Business Ready
-- Run this in Supabase SQL Editor before deploying v1.1.

create table if not exists public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  action text not null,
  identifier text not null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists rate_limit_events_action_identifier_created_at_idx
on public.rate_limit_events (action, identifier, created_at desc);

alter table public.rate_limit_events enable row level security;

drop policy if exists "rate_limit_events_service_role_only" on public.rate_limit_events;
create policy "rate_limit_events_service_role_only"
on public.rate_limit_events
for all
using (false)
with check (false);

-- Optional cleanup. Execute manually from time to time if needed:
-- delete from public.rate_limit_events where created_at < now() - interval '7 days';
