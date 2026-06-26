# BattleBooking v6.7.0 Email Engine

Тази версия добавя реално изпращане на email-и чрез Resend.

## 1. Създай Resend акаунт

Отиди в Resend и създай API key.

## 2. Добави environment variables

В локалния `.env.local` и после във Vercel добави:

```env
RESEND_API_KEY=твоят_resend_api_key
BATTLEBOOKING_EMAIL_FROM=BattleBooking <onboarding@resend.dev>
BATTLEBOOKING_EMAIL_REPLY_TO=battlebooking@abv.bg
```

Важно: `onboarding@resend.dev` е подходящо за тест. За официално пускане ще вържем домейна `battlebooking.bg` и тогава From ще стане примерно:

```env
BATTLEBOOKING_EMAIL_FROM=BattleBooking <noreply@battlebooking.bg>
```

## 3. Какво работи

- При заявка от `/register-field` се изпраща email: „Получихме заявката Ви“.
- При промяна на статус в `/admin/requests` се изпраща email според решението:
  - Approve / Payment → одобрена заявка
  - Reject → отказана заявка
  - Suspend → временно спрян достъп

## 4. Ако RESEND_API_KEY липсва

Сайтът няма да се чупи. Заявката и статусите ще се записват в Supabase, но ще пише, че email не е изпратен.
