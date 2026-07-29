-- BattleBooking v1.8.3 - upload RLS + field deletion support
-- Run once in Supabase SQL Editor.

alter table public.field_images enable row level security;

-- Public profile gallery can be viewed by everyone.
drop policy if exists "Public read field images" on public.field_images;
create policy "Public read field images"
on public.field_images for select
to public
using (true);

-- Organizers can manage images only for fields that belong to their email
-- either directly through fields.owner_email or through the original field_requests link.
drop policy if exists "Organizers insert own field images" on public.field_images;
create policy "Organizers insert own field images"
on public.field_images for insert
to authenticated
with check (
  exists (
    select 1 from public.fields f
    where f.id = field_images.field_id
      and lower(coalesce(f.owner_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  or exists (
    select 1 from public.field_requests fr
    where fr.field_id = field_images.field_id
      and lower(coalesce(fr.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

drop policy if exists "Organizers update own field images" on public.field_images;
create policy "Organizers update own field images"
on public.field_images for update
to authenticated
using (
  exists (
    select 1 from public.fields f
    where f.id = field_images.field_id
      and lower(coalesce(f.owner_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  or exists (
    select 1 from public.field_requests fr
    where fr.field_id = field_images.field_id
      and lower(coalesce(fr.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
)
with check (true);

drop policy if exists "Organizers delete own field images" on public.field_images;
create policy "Organizers delete own field images"
on public.field_images for delete
to authenticated
using (
  exists (
    select 1 from public.fields f
    where f.id = field_images.field_id
      and lower(coalesce(f.owner_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  or exists (
    select 1 from public.field_requests fr
    where fr.field_id = field_images.field_id
      and lower(coalesce(fr.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

-- Fallback Storage policies. The new API normally uploads with the service-role key,
-- but these prevent RLS failures if the server temporarily uses the authenticated client.
drop policy if exists "Authenticated upload battlebooking media" on storage.objects;
create policy "Authenticated upload battlebooking media"
on storage.objects for insert
to authenticated
with check (bucket_id = 'battlebooking-media');

drop policy if exists "Authenticated update battlebooking media" on storage.objects;
create policy "Authenticated update battlebooking media"
on storage.objects for update
to authenticated
using (bucket_id = 'battlebooking-media')
with check (bucket_id = 'battlebooking-media');

drop policy if exists "Authenticated delete battlebooking media" on storage.objects;
create policy "Authenticated delete battlebooking media"
on storage.objects for delete
to authenticated
using (bucket_id = 'battlebooking-media');

notify pgrst, 'reload schema';
