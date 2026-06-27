-- BattleBooking v1.5.1 - password at access request
-- Run this once in Supabase SQL Editor.

alter table field_requests
add column if not exists requested_password text;

comment on column field_requests.requested_password is
'Temporary password chosen during access request. Cleared after approval and Supabase Auth user creation.';
