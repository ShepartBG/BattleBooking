create table if not exists field_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),

  field_name text not null,
  owner_name text not null,
  email text not null,
  phone text not null,
  city text,
  website text,
  facebook text,
  instagram text,
  tiktok text,
  message text,

  status text not null default 'pending',
  admin_notes text,
  decision_message text,
  reviewed_at timestamp with time zone,

  constraint field_requests_status_check check (
    status in ('pending', 'payment_pending', 'active', 'suspended', 'rejected')
  )
);

alter table field_requests add column if not exists owner_name text;
alter table field_requests add column if not exists website text;
alter table field_requests add column if not exists facebook text;
alter table field_requests add column if not exists instagram text;
alter table field_requests add column if not exists tiktok text;
alter table field_requests add column if not exists message text;
alter table field_requests add column if not exists admin_notes text;
alter table field_requests add column if not exists decision_message text;
alter table field_requests add column if not exists reviewed_at timestamp with time zone;

alter table field_requests enable row level security;

drop policy if exists "Anyone can create field requests" on field_requests;
drop policy if exists "Authenticated users can read field requests" on field_requests;
drop policy if exists "Authenticated users can update field requests" on field_requests;
drop policy if exists "Anyone can read field requests for now" on field_requests;
drop policy if exists "Anyone can update field requests for now" on field_requests;

create policy "Anyone can create field requests"
on field_requests
for insert
to anon, authenticated
with check (true);

create policy "Authenticated users can read field requests"
on field_requests
for select
to authenticated
using (true);

create policy "Authenticated users can update field requests"
on field_requests
for update
to authenticated
using (true)
with check (true);
