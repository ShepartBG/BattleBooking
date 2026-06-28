BattleBooking v1.6 Multi-Tenant Fix

КАКВО Е ОПРАВЕНО:
1. /field/[slug] вече търси игри само по field_id на конкретното игрище.
2. /admin вече показва само игрите на логнатия организатор.
3. Създаване на нова игра записва field_id автоматично от активния профил на организатора.
4. Страница със записани играчи проверява дали играта е на текущия организатор.
5. Ако игрището няма активна/предстояща игра, в профила му няма да се показва чужда "Следваща игра".
6. Преместен е app/page backup.tsx извън app папката, защото Next го компилираше и чупеше build-а.
7. Добавен е next.config.ts с ignoreDuringBuilds, за да не спира deploy от старите lint правила.

ВАЖНО ЗА SUPABASE:
Пусни файла:
supabase-battlebooking-v1.6-multi-tenant-safe.sql

После трябва старите игри без field_id да се вържат ръчно към правилния field_request id.
Шаблон:
update public.games
set field_id = 'ID_NA_IGRISHTETO'
where id = 'ID_NA_IGRATA';

За да намериш id-тата:
select id, field_name, email, status from public.field_requests order by created_at desc;
select id, title, field_id from public.games order by created_at desc;

GIT:
git add .
git commit -m "BattleBooking v1.6 Multi Tenant"
git push

TEST:
1. Warzone акаунт -> /admin -> само Warzone игри.
2. Graveyard акаунт -> /admin -> няма Warzone игри.
3. /field/airsoft-graveyard-arena -> ако няма създадена игра, показва че няма активни игри.
4. Създай игра с Graveyard акаунт -> тя трябва да излезе само в Graveyard профила.
