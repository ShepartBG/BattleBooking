-- BattleBooking v6.7.3
-- Strong delete fix for field_requests.
-- Run this in Supabase SQL Editor -> New Query -> Run.

alter table field_requests enable row level security;

-- Keep normal delete policy open for the current beta owner dashboard.
drop policy if exists "Delete field requests for owner beta" on field_requests;
drop policy if exists "Owner can delete field requests for beta" on field_requests;
drop policy if exists "Anyone can delete field requests for beta" on field_requests;

create policy "Delete field requests for owner beta"
on field_requests
for delete
to anon, authenticated
using (true);

-- RPC fallback: deletes by id even when client-side RLS delete behaves badly during beta testing.
create or replace function public.delete_field_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.field_requests
  where id = request_id;
end;
$$;

grant execute on function public.delete_field_request(uuid) to anon, authenticated;
