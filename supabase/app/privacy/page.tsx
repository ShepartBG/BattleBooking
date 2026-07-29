import PublicShell from "@/components/public/PublicShell";

export default function PrivacyPage() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-[2rem] border border-white/10 bg-black/70 p-6 backdrop-blur-xl sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-lime-300">GDPR</p>
          <h1 className="mt-3 text-4xl font-black">Политика за поверителност</h1>
          <p className="mt-2 text-sm text-zinc-500">Последна актуализация: v1.1.0</p>
          <div className="legal-content mt-6 space-y-4 leading-7 text-zinc-300">
            <p>BattleBooking.bg обработва лични данни само доколкото е необходимо за записване за игра, управление на организаторски профили и поддръжка на платформата.</p>
            <h2>Какви данни събираме</h2>
            <p>При записване: име, фамилия, телефон, възраст, тип участие, код на регистрация, приета декларация/правила и час на записване.</p>
            <p>При организаторски профил: имейл, данни за игрище, контактна информация и настройки на профила.</p>
            <h2>Защо ги използваме</h2>
            <p>За да се създаде списък с участници, да се контролира наемната екипировка, да се предотвратяват дублирани записи и да се осигури комуникация между организатор и участник.</p>
            <h2>Съхранение</h2>
            <p>Данните се пазят в Supabase база данни и се достъпват само от съответния организатор и системния администратор. Данните не се продават на трети лица.</p>
            <h2>Права на потребителя</h2>
            <p>Потребителят може да поиска информация, корекция или изтриване на данните си чрез контакт с организатора или BattleBooking.</p>
            <h2>Контакт</h2>
            <p>За въпроси относно лични данни: battlebooking@abv.bg</p>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
