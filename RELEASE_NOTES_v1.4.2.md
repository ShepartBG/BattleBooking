# BattleBooking v1.4.2

## Какво е ново

- Професионален email sender:
  - `BattleBooking <noreply@battlebooking.bg>`
  - `reply-to: battlebooking@abv.bg`
- Email footer с:
  - battlebooking@abv.bg
  - 0897 047 668
  - battlebooking.bg
  - Your Battle. Our Mission.
- Премахнати debug логове от email sender-а.
- Блокиране на дублирани заявки по:
  - email
  - телефон
  - име на игрище
- Ако заявката е rejected/deleted, човекът може да кандидатства отново.
- След успешна заявка бутонът се заключва и става: `✓ Заявката е изпратена`.

## Важно за production

Във Vercel трябва да бъдат добавени Environment Variables:

```env
RESEND_API_KEY=...
BATTLEBOOKING_EMAIL_FROM=BattleBooking <noreply@battlebooking.bg>
BATTLEBOOKING_EMAIL_REPLY_TO=battlebooking@abv.bg
BATTLEBOOKING_OWNER_EMAIL=battlebooking@abv.bg
BATTLEBOOKING_CONTACT_EMAIL=battlebooking@abv.bg
BATTLEBOOKING_CONTACT_PHONE=0897 047 668
NEXT_PUBLIC_SITE_URL=https://battlebooking.bg
```

Resend домейнът `battlebooking.bg` трябва да е verified, за да праща до всички получатели от `noreply@battlebooking.bg`.
