-- BattleBooking v1.5 - Accounts & Access
-- Пусни целия файл като едно query в Supabase SQL Editor.

alter table field_requests
add column if not exists access_status text default 'pending',
add column if not exists trial_started_at timestamptz,
add column if not exists subscription_valid_until date,
add column if not exists grace_until date,
add column if not exists access_blocked_reason text;

update field_requests
set access_status = status
where access_status is null;

-- Ако някой вече е active, но няма дати, дай му 1 месец trial + 7 дни grace от днес.
update field_requests
set
  trial_started_at = coalesce(trial_started_at, now()),
  subscription_valid_until = coalesce(subscription_valid_until, (current_date + interval '30 days')::date),
  grace_until = coalesce(grace_until, (current_date + interval '37 days')::date)
where status = 'active';

-- Optional: index за по-бърза login проверка по email.
create index if not exists field_requests_email_access_idx
on field_requests (lower(email), access_status, grace_until);
