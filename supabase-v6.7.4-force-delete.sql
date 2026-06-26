-- BattleBooking v6.7.4
-- Force delete fix for field_requests during beta testing.
-- Run in Supabase -> SQL Editor -> New Query -> Run.

alter table public.field_requests enable row level security;

drop policy if exists "Delete field requests for owner beta" on public.field_requests;
drop policy if exists "Owner can delete field requests for beta" on public.field_requests;
drop policy if exists "Anyone can delete field requests for beta" on public.field_requests;
drop policy if exists "Beta owner can delete field requests" on public.field_requests;

create policy "Beta owner can delete field requests"
on public.field_requests
for delete
to anon, authenticated
using (true);

create or replace function public.delete_field_request(request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.field_requests
  where id = request_id;

  get diagnostics deleted_count = row_count;
  return deleted_count > 0;
end;
$$;

grant execute on function public.delete_field_request(uuid) to anon, authenticated;
