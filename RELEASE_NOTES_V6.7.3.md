# BattleBooking v6.7.3

## Fix
- Delete в `/admin/requests` вече използва Supabase RPC `delete_field_request`.
- Това заобикаля проблема, при който RLS може да оставя заявката в таблицата, въпреки че бутонът е натиснат.

## Supabase
Пусни:

```txt
supabase-v6.7.3-request-delete-rpc.sql
```

След това тествай Delete от `/admin/requests`.
