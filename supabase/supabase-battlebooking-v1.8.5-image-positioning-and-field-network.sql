alter table public.fields add column if not exists background_x numeric default 50;
alter table public.fields add column if not exists background_y numeric default 50;

alter table public.field_images add column if not exists position_x numeric default 50;
alter table public.field_images add column if not exists position_y numeric default 50;

alter table public.partner_shops add column if not exists logo_x numeric default 50;
alter table public.partner_shops add column if not exists logo_y numeric default 50;
alter table public.partner_shops add column if not exists cover_x numeric default 50;
alter table public.partner_shops add column if not exists cover_y numeric default 50;

alter table public.special_events add column if not exists cover_x numeric default 50;
alter table public.special_events add column if not exists cover_y numeric default 50;

notify pgrst, 'reload schema';
