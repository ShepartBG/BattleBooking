-- BattleBooking v1.2 - Отложени игри
-- Пусни това веднъж в Supabase SQL Editor преди да тестваш бутона "Отложи".

alter table public.games
add column if not exists postponed_reason text;

-- Ако имаш CHECK constraint за status само active/closed, трябва да го обновим ръчно.
-- Ако нямаш constraint, горният ред е достатъчен.
-- Новите валидни статуси са: active, closed, postponed.
