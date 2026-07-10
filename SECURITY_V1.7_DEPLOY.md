# BattleBooking Security v1.7 — Deployment

## 1. Required Vercel environment variable

Confirm that `SUPABASE_SERVICE_ROLE_KEY` exists in Vercel for Production. Never expose it with a `NEXT_PUBLIC_` prefix.

## 2. Deploy the updated project first

The public field request form now uses `/api/field-requests`, and public registration statistics are reloaded through the protected server endpoint. Deploy this code before enabling the new RLS rules.

## 3. Run the SQL migration

In Supabase → SQL Editor, run:

`supabase/supabase-battlebooking-v1.7-production-rls.sql`

The migration runs in a transaction, removes old policies, creates the production policies, and enables RLS on all BattleBooking tables.

## 4. Test immediately

1. Open `/`, `/games`, and a public game while logged out.
2. Submit a test field request.
3. Submit a test player registration.
4. Log in as WARZONE and verify only WARZONE games and registrations are visible.
5. Log in as the BattleBooking owner and verify all requests and games are visible.
6. Create, edit, postpone, close, and delete a test game.
7. In Supabase Security Advisor, click **Rerun linter**.

## Rollback (emergency only)

If the admin area is blocked before the code deployment is complete, temporarily run:

```sql
alter table public.field_requests disable row level security;
alter table public.fields disable row level security;
alter table public.games disable row level security;
alter table public.organizations disable row level security;
alter table public.organizers disable row level security;
alter table public.profiles disable row level security;
alter table public.registrations disable row level security;
```

Then fix the deployment and rerun the v1.7 migration. Do not leave RLS disabled.
