BattleBooking v1.6.1 - Real field_id fix

Какво е оправено:
1. lib/currentField.ts вече НЕ използва field_requests.id като field_id.
2. Добавен е lib/fieldIdentity.ts, който намира реалния fields.id по field_name/city/phone.
3. app/api/public-fields/route.ts вече връща реалния fields.id към публичната /field/[slug] страница.
4. Така /admin, /admin/new-game и /field/[slug] трябва да работят с games.field_id = fields.id.

Важно:
- Не пускай повече SQL за този проблем.
- В Supabase вече видяхме, че games.field_id сочи към fields.id и това е правилно.

След качване:
npm run build
git add .
git commit -m "BattleBooking v1.6.1 real field id fix"
git push

Тест:
1. Warzone акаунт -> /admin -> трябва да вижда Warzone играта.
2. Test акаунт -> /admin -> не трябва да вижда Warzone играта.
3. /field/airsoft-graveyard-arena -> ако няма активна игра за Graveyard, не трябва да показва Warzone.
