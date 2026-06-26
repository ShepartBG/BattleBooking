-- BattleBooking v6.7.2 safe patch
-- Fix for owner/testing DELETE in field_requests.
-- Run this in Supabase SQL Editor if the Delete button does not remove requests.

alter table field_requests enable row level security;

drop policy if exists "Owner can delete field requests for beta" on field_requests;
drop policy if exists "Anyone can delete field requests for beta" on field_requests;
drop policy if exists "Delete field requests for owner beta" on field_requests;

create policy "Delete field requests for owner beta"
on field_requests
for delete
to anon, authenticated
using (true);
