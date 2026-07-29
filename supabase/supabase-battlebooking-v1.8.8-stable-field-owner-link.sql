-- Stable link between one admin account and all of its fields.
alter table public.fields
  add column if not exists owner_user_id uuid;

-- Preserve the original approved field owner email.
update public.fields f
set owner_email = lower(fr.email)
from public.field_requests fr
where fr.field_id = f.id
  and fr.email is not null
  and btrim(fr.email) <> ''
  and (f.owner_email is null or btrim(f.owner_email) = '');

-- Resolve the auth user UUID from the saved owner email.
update public.fields f
set owner_user_id = u.id
from auth.users u
where lower(u.email) = lower(f.owner_email)
  and f.owner_email is not null
  and btrim(f.owner_email) <> ''
  and f.owner_user_id is null;

create index if not exists fields_owner_user_id_idx
  on public.fields(owner_user_id);

notify pgrst, 'reload schema';
