# BattleBooking v6.7.4

## Fixed
- Delete flow now verifies that the request is actually gone from Supabase.
- If Supabase blocks delete, the UI shows a clear SQL instruction instead of a false success message.
- Request action buttons are polished again.

## Required
Run `supabase-v6.7.4-force-delete.sql` in Supabase SQL Editor before testing Delete.
