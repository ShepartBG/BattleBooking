import PublicShell from "@/components/public/PublicShell";

export default function CookiesPage() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-[2rem] border border-white/10 bg-black/70 p-6 backdrop-blur-xl sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-lime-300">Cookies</p>
          <h1 className="mt-3 text-4xl font-black">Политика за бисквитките</h1>
          <p className="mt-2 text-sm text-zinc-500">Последна актуализация: v1.1.0</p>
          <div className="legal-content mt-6 space-y-4 leading-7 text-zinc-300">
            <p>BattleBooking използва нужни бисквитки и локално съхранение, за да работи сайтът нормално.</p>
            <h2>Нужни бисквитки</h2>
            <p>Използват се за вход в профил, запомняне на избора за бисквитки и ограничаване на повторна регистрация от същия браузър.</p>
            <h2>Аналитични и маркетинг бисквитки</h2>
            <p>Към момента платформата не разчита на задължителни маркетинг бисквитки. Ако бъдат добавени аналитични инструменти, те трябва да се активират само след съгласие.</p>
            <h2>Управление</h2>
            <p>Можеш да изтриеш бисквитките от настройките на браузъра си. Това може да изчисти запомнени предпочитания или сесии.</p>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
