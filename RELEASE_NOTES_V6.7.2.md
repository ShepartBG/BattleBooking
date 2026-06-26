# BattleBooking v6.7.2 - Request Delete & Duplicate Fix

## Fixed
- Removed the old 7-day browser/localStorage duplicate block from Register Field.
- Duplicate check now uses Supabase status only.
- `rejected` and deleted requests no longer block new test requests.
- `pending`, `payment_pending`, `active`, and `suspended` still block duplicate access requests.
- Delete now performs a real Supabase `.delete()` and refreshes the list.
- Added clearer error message if Supabase RLS blocks delete.

## Supabase
Run `supabase-v6.7.2-request-delete-fix.sql` only if Delete still does not remove records.
