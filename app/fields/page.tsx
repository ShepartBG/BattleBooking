"use client";

import PublicShell from "@/components/public/PublicShell";
import FieldCard from "@/components/public/FieldCard";
import { useFieldSettings } from "@/lib/useFieldSettings";

export default function FieldsPage() {
  const fieldSettings = useFieldSettings();

  return (
    <PublicShell>
      <section className="mx-auto w-full max-w-7xl px-4 py-12">
        <div className="rounded-[2.4rem] border border-white/10 bg-black/60 p-8 backdrop-blur-xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#b7ef16]">
            BattleBooking Marketplace
          </p>
          <h1 className="mt-3 text-5xl font-black tracking-tight md:text-7xl">
            Игрища
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-300">
            Тук ще се виждат всички airsoft игрища, които използват
            BattleBooking. Всеки играч ще може да избира къде има активна игра и
            да се запише директно.
          </p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          <FieldCard
            name={fieldSettings.name}
            location={fieldSettings.location}
            description={fieldSettings.description}
            href={`/field/${fieldSettings.slug || "warzone"}`}
            image={fieldSettings.backgroundUrl}
            logo={fieldSettings.logoUrl}
            logoFit={fieldSettings.logoFit}
            logoScale={fieldSettings.logoScale}
            logoX={fieldSettings.logoX}
            logoY={fieldSettings.logoY}
          />
          <FieldCard
            name="Tactical Arena"
            location="Очаква регистрация"
            description="Примерна карта за бъдещо игрище. Следващите партньори ще се появяват тук."
            href="/register-field"
            status="Очаква одобрение"
            logo="/battlebooking-mark.png"
          />
          <FieldCard
            name="Black Ops Field"
            location="Очаква регистрация"
            description="BattleBooking е подготвен да се разширява към много игрища и градове."
            href="/register-field"
            status="Очаква одобрение"
            logo="/battlebooking-mark.png"
          />
        </div>
      </section>
    </PublicShell>
  );
}
