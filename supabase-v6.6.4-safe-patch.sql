-- BattleBooking v6.6.4 safe patch
-- Пуска се само ако Supabase даде грешка за липсваща колона.
-- Ако v6.6.2 SQL вече е минал успешно, този файл може пак да се пусне безопасно.

alter table field_requests
  add column if not exists tiktok text,
  add column if not exists decision_message text,
  add column if not exists admin_notes text,
  add column if not exists reviewed_at timestamp with time zone;
