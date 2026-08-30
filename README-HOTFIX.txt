BattleBooking GAME CACHE + RENTAL INPUT HOTFIX

Промени:
1. /api/public-games вече е force-dynamic, revalidate=0 и Cache-Control: no-store.
2. /api/public-game/[id] и /api/public-fields също не кешират динамични данни за игри.
3. Началната страница и /games викат динамичните API-та с cache: no-store.
4. Полето „Комплекти под наем“ допуска празна стойност; вече не връща автоматично 0 докато пишеш.
5. При запис празно поле се нормализира до 0, а стойностите се пазят като цели неотрицателни числа.

Копирай папка app върху проекта и замени файловете.
