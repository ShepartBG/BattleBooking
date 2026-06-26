-- BattleBooking v6.7.1 safe patch
-- Нужно само ако Delete бутонът даде грешка за permission/RLS.
-- Позволява триене на field_requests за текущия beta owner workflow.

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'field_requests'
      and policyname = 'Owner can delete field requests for beta'
  ) then
    create policy "Owner can delete field requests for beta"
    on field_requests
    for delete
    to anon, authenticated
    using (true);
  end if;
end $$;
